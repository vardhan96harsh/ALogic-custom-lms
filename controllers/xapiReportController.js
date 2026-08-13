const mongoose = require("mongoose");

const XapiStatement = require("../models/XapiStatement");
const CourseProgress = require("../models/CourseProgress");
const Course = require("../models/Course");

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const MODULE_ACTIVITY_TYPE =
  "http://adlnet.gov/expapi/activities/module";

const COMPLETION_NAME = "completion";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function durationToSeconds(duration) {
  if (!duration || typeof duration !== "string") {
    return 0;
  }

  const match = duration.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
  );

  if (!match) {
    return 0;
  }

  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  const seconds = Number(match[4] || 0);

  return (
    days * 86400 +
    hours * 3600 +
    minutes * 60 +
    seconds
  );
}

function getVerbName(statement) {
  return (
    statement?.verb?.display?.["en-US"] ||
    statement?.verb?.display?.und ||
    statement?.verb?.id ||
    ""
  )
    .toString()
    .toLowerCase()
    .trim();
}

function getActivityName(statement) {
  return (
    statement?.object?.definition?.name?.["en-US"] ||
    statement?.object?.definition?.name?.und ||
    statement?.object?.id ||
    ""
  ).toString();
}

function getActivityType(statement) {
  return (
    statement?.object?.definition?.type ||
    ""
  ).toString();
}

function getScore(progress) {
  return (
    progress?.score || {
      raw: null,
      min: null,
      max: null,
      scaled: null,
    }
  );
}

/*
|--------------------------------------------------------------------------
| Determine Result
|--------------------------------------------------------------------------
|
| Storyline may not send "passed".
|
| Therefore:
|
| failed     -> failed
| passed     -> passed
| completed  -> passed
| completion -> passed
| otherwise  -> unknown
|
|--------------------------------------------------------------------------
*/

function determineSuccessStatus(progress) {
  if (!progress) {
    return "unknown";
  }

  if (
    progress.successStatus === "failed"
  ) {
    return "failed";
  }

  if (
    progress.successStatus === "passed"
  ) {
    return "passed";
  }

  /*
  |--------------------------------------------------------------------------
  | Native xAPI failed
  |--------------------------------------------------------------------------
  */

  if (
    progress.lastVerb === "failed"
  ) {
    return "failed";
  }

  /*
  |--------------------------------------------------------------------------
  | Native xAPI passed
  |--------------------------------------------------------------------------
  */

  if (
    progress.lastVerb === "passed"
  ) {
    return "passed";
  }

  /*
  |--------------------------------------------------------------------------
  | Storyline completion fallback
  |--------------------------------------------------------------------------
  |
  | Storyline commonly sends:
  |
  | experienced
  | STEP 1: COMPLETION
  |
  |--------------------------------------------------------------------------
  */

  if (
    progress.completed &&
    progress.lastActivityName &&
    progress.lastActivityName
      .toLowerCase()
      .includes(COMPLETION_NAME)
  ) {
    return "passed";
  }

  /*
  |--------------------------------------------------------------------------
  | Completed without explicit result
  |--------------------------------------------------------------------------
  */

  if (progress.completed) {
    return "passed";
  }

  return "unknown";
}

/*
|--------------------------------------------------------------------------
| Completion Percentage
|--------------------------------------------------------------------------
*/

function getCompletionPercentage(
  progress,
  course
) {
  if (!progress) {
    return 0;
  }

  if (progress.completed) {
    return 100;
  }

  const visited =
    Number(progress.modulesVisited) || 0;

  const total =
    Number(
      course?.xapiConfig?.totalModules
    ) || 0;

  if (total > 0) {
    return Math.min(
      100,
      Math.round(
        (visited / total) * 100
      )
    );
  }

  return 0;
}

/*
|--------------------------------------------------------------------------
| Build Course Report Object
|--------------------------------------------------------------------------
*/

function buildCourseReport(
  progress,
  course
) {
  const totalModules =
    Number(
      course?.xapiConfig?.totalModules
    ) || 0;

  const completionPercentage =
    getCompletionPercentage(
      progress,
      course
    );

  const successStatus =
    determineSuccessStatus(progress);

  return {
    id: progress._id,

    guestId:
      progress.guestId,

    courseId:
      course?._id ||
      progress.courseId,

    courseTitle:
      course?.title ||
      "Unknown Course",

    courseThumbnail:
      course?.thumbnail ||
      "",

    registration:
      progress.registration,

    status:
      progress.status ||
      "in_progress",

    completed:
      Boolean(progress.completed),

    completedAt:
      progress.completedAt ||
      null,

    successStatus,

    score:
      getScore(progress),

    completionPercentage,

    modulesVisited:
      Number(
        progress.modulesVisited
      ) || 0,

    totalModules,

    totalDurationSeconds:
      Number(
        progress.totalDurationSeconds
      ) || 0,

    firstActivityAt:
      progress.firstActivityAt ||
      null,

    lastActivityAt:
      progress.lastActivityAt ||
      null,

    lastActivityName:
      progress.lastActivityName ||
      "",

    lastVerb:
      progress.lastVerb ||
      "",

    createdAt:
      progress.createdAt,

    updatedAt:
      progress.updatedAt,
  };
}

/*
|--------------------------------------------------------------------------
| GET Guest Course Report
|--------------------------------------------------------------------------
|
| GET
| /api/xapi/reports/:courseId/:guestId
|
|--------------------------------------------------------------------------
*/

async function getGuestCourseReport(
  req,
  res
) {
  try {
    const {
      courseId,
      guestId,
    } = req.params;

    const {
      registration,
    } = req.query;

    /*
    |--------------------------------------------------------------------------
    | Validate Course ID
    |--------------------------------------------------------------------------
    */

    if (
      !mongoose.Types.ObjectId.isValid(
        courseId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid courseId",
      });
    }

    if (!guestId) {
      return res.status(400).json({
        success: false,
        message:
          "guestId is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Build Progress Query
    |--------------------------------------------------------------------------
    */

    const progressQuery = {
      guestId,
      courseId,
    };

    if (registration) {
      progressQuery.registration =
        registration;
    }

    /*
    |--------------------------------------------------------------------------
    | Select Best Attempt
    |--------------------------------------------------------------------------
    |
    | Priority:
    |
    | 1. Latest completed attempt
    | |2. Latest in-progress attempt
    |
    |--------------------------------------------------------------------------
    */

    let progress =
      await CourseProgress.findOne({
        ...progressQuery,
        completed: true,
      })
        .sort({
          completedAt: -1,
        })
        .lean();

    if (!progress) {
      progress =
        await CourseProgress.findOne(
          progressQuery
        )
          .sort({
            updatedAt: -1,
          })
          .lean();
    }

    /*
    |--------------------------------------------------------------------------
    | Course
    |--------------------------------------------------------------------------
    */

    const course =
      await Course.findById(courseId)
        .select(
          "title thumbnail xapiConfig"
        )
        .lean();

    /*
    |--------------------------------------------------------------------------
    | xAPI Statement Filter
    |--------------------------------------------------------------------------
    */

    const statementFilter = {
      guestId,
      courseId,
    };

    if (progress?.registration) {
      statementFilter.registration =
        progress.registration;
    } else if (registration) {
      statementFilter.registration =
        registration;
    }

    /*
    |--------------------------------------------------------------------------
    | Statements
    |--------------------------------------------------------------------------
    */

    const statements =
      await XapiStatement.find(
        statementFilter
      )
        .sort({
          timestamp: 1,
          storedAt: 1,
        })
        .lean();

    if (
      statements.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "No xAPI statements found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Build Timeline + Modules
    |--------------------------------------------------------------------------
    */

    let totalDurationSeconds = 0;

    const moduleMap =
      new Map();

    const timeline =
      statements.map(
        (statement) => {
          const verb =
            getVerbName(statement);

          const activityName =
            getActivityName(
              statement
            );

          const duration =
            statement?.result
              ?.duration || "";

          const durationSeconds =
            durationToSeconds(
              duration
            );

          totalDurationSeconds +=
            durationSeconds;

          const activityType =
            getActivityType(
              statement
            );

          const isModule =
            activityType ===
            MODULE_ACTIVITY_TYPE;

          if (isModule) {
            const moduleId =
              statement?.object?.id ||
              activityName;

            if (
              !moduleMap.has(
                moduleId
              )
            ) {
              moduleMap.set(
                moduleId,
                {
                  moduleId,

                  moduleName:
                    activityName,

                  visits: 0,

                  durationSeconds: 0,

                  firstActivityAt:
                    null,

                  lastActivityAt:
                    null,
                }
              );
            }

            const module =
              moduleMap.get(
                moduleId
              );

            if (
              verb ===
                "experienced" ||
              verb === "entered"
            ) {
              module.visits++;
            }

            module.durationSeconds +=
              durationSeconds;

            const activityTime =
              statement.timestamp ||
              statement.storedAt;

            if (
              !module.firstActivityAt
            ) {
              module.firstActivityAt =
                activityTime;
            }

            module.lastActivityAt =
              activityTime;
          }

          return {
            statementId:
              statement.statementId,

            verb,

            verbId:
              statement?.verb?.id ||
              "",

            activityId:
              statement?.object?.id ||
              "",

            activityName,

            activityType,

            duration,

            durationSeconds,

            timestamp:
              statement.timestamp ||
              statement.storedAt,
          };
        }
      );

    const modules =
      Array.from(
        moduleMap.values()
      );

    /*
    |--------------------------------------------------------------------------
    | Result
    |--------------------------------------------------------------------------
    */

    let successStatus =
      determineSuccessStatus(
        progress
      );

    /*
    |--------------------------------------------------------------------------
    | Check Timeline Too
    |--------------------------------------------------------------------------
    |
    | This protects us when CourseProgress has
    | not been updated correctly but xAPI contains
    | the actual result.
    |
    |--------------------------------------------------------------------------
    */

    const failedStatement =
      statements.find(
        (statement) =>
          getVerbName(
            statement
          ) === "failed"
      );

    const passedStatement =
      statements.find(
        (statement) =>
          getVerbName(
            statement
          ) === "passed"
      );

    const completionStatement =
      statements.find(
        (statement) =>
          getActivityName(
            statement
          )
            .toLowerCase()
            .includes(
              COMPLETION_NAME
            )
      );

    if (failedStatement) {
      successStatus =
        "failed";
    } else if (
      passedStatement ||
      completionStatement
    ) {
      successStatus =
        "passed";
    }

    /*
    |--------------------------------------------------------------------------
    | Completion
    |--------------------------------------------------------------------------
    */

    let completed =
      Boolean(
        progress?.completed
      );

    if (
      failedStatement ||
      passedStatement ||
      completionStatement
    ) {
      completed = true;
    }

    /*
    |--------------------------------------------------------------------------
    | Completion Percentage
    |--------------------------------------------------------------------------
    */

    let completionPercentage =
      0;

    if (completed) {
      completionPercentage =
        100;
    } else if (
      course?.xapiConfig
        ?.totalModules > 0
    ) {
      completionPercentage =
        Math.min(
          100,
          Math.round(
            (Number(
              progress?.modulesVisited ||
                modules.length
            ) /
              Number(
                course.xapiConfig
                  .totalModules
              )) *
              100
          )
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

    let status =
      progress?.status ||
      "in_progress";

    if (completed) {
      status = "completed";
    }

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      data: {
        guestId,

        courseId,

        courseTitle:
          course?.title ||
          "Unknown Course",

        registration:
          progress?.registration ||
          registration ||
          "",

        status,

        completed,

        completedAt:
          progress?.completedAt ||
          (
            completionStatement
              ? completionStatement
                  .timestamp ||
                completionStatement
                  .storedAt
              : null
          ),

        successStatus,

        score:
          getScore(progress),

        completionPercentage,

        modulesVisited:
          progress?.modulesVisited ||
          modules.length,

        totalModules:
          Number(
            course?.xapiConfig
              ?.totalModules
          ) || 0,

        totalStatements:
          statements.length,

        totalDurationSeconds:
          Number(
            (
              progress?.totalDurationSeconds ??
              totalDurationSeconds
            ).toFixed(2)
          ),

        firstActivityAt:
          progress?.firstActivityAt ||
          timeline[0]?.timestamp ||
          null,

        lastActivityAt:
          progress?.lastActivityAt ||
          timeline[
            timeline.length - 1
          ]?.timestamp ||
          null,

        lastActivityName:
          progress?.lastActivityName ||
          timeline[
            timeline.length - 1
          ]?.activityName ||
          "",

        lastVerb:
          progress?.lastVerb ||
          timeline[
            timeline.length - 1
          ]?.verb ||
          "",

        modules,

        timeline,
      },
    });
  } catch (error) {
    console.error(
      "Get guest xAPI report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to build guest xAPI report",
    });
  }
}

/*
|--------------------------------------------------------------------------
| GET ADMIN COURSE REPORTS
|--------------------------------------------------------------------------
|
| GET
| /api/xapi/admin/reports
|
| Query:
|
| page
| limit
| search
| status
| result
| courseId
|
|--------------------------------------------------------------------------
*/

async function getAdminCourseReports(
  req,
  res
) {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      result = "",
      courseId = "",
    } = req.query;

    const currentPage =
      Math.max(
        1,
        Number(page) || 1
      );

    const perPage =
      Math.min(
        100,
        Math.max(
          1,
          Number(limit) || 10
        )
      );

    const searchText =
      search.trim();

    /*
    |--------------------------------------------------------------------------
    | Validate courseId
    |--------------------------------------------------------------------------
    */

    if (
      courseId &&
      !mongoose.Types.ObjectId.isValid(
        courseId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid courseId",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Base Query
    |--------------------------------------------------------------------------
    */

    const query = {};

    if (courseId) {
      query.courseId =
        courseId;
    }

    if (
      status &&
      [
        "not_started",
        "in_progress",
        "completed",
      ].includes(status)
    ) {
      query.status = status;
    }

    if (
      result &&
      [
        "unknown",
        "passed",
        "failed",
      ].includes(result)
    ) {
      /*
      |--------------------------------------------------------------------------
      | We do NOT directly use successStatus for
      | passed because Storyline completion often
      | leaves successStatus = unknown.
      |
      | Passed is handled after loading records.
      |--------------------------------------------------------------------------
      */

      if (result === "failed") {
        query.$or = [
          {
            successStatus:
              "failed",
          },
          {
            lastVerb: "failed",
          },
        ];
      }

      if (result === "passed") {
        query.$or = [
          {
            successStatus:
              "passed",
          },
          {
            lastVerb: "passed",
          },
          {
            completed: true,
            lastActivityName: {
              $regex:
                COMPLETION_NAME,
                $options: "i",
            },
          },
        ];
      }

      if (result === "unknown") {
        query.successStatus =
          "unknown";
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    |
    | Search guestId and registration directly
    |
    |--------------------------------------------------------------------------
    */

    if (searchText) {
      query.$and =
        query.$and || [];

      query.$and.push({
        $or: [
          {
            guestId: {
              $regex:
                searchText,
              $options: "i",
            },
          },
          {
            registration: {
              $regex:
                searchText,
              $options: "i",
            },
          },
        ],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Fetch ALL matching records first
    |--------------------------------------------------------------------------
    |
    | This lets us correctly search course title and
    | calculate passed/failed summaries.
    |
    |--------------------------------------------------------------------------
    */

    const progressRecords =
      await CourseProgress.find(
        query
      )
        .populate({
          path: "courseId",
          select:
            "title thumbnail xapiConfig",
        })
        .sort({
          updatedAt: -1,
        })
        .lean();

    /*
    |--------------------------------------------------------------------------
    | Build Reports
    |--------------------------------------------------------------------------
    */

    let reports =
      progressRecords.map(
        (progress) =>
          buildCourseReport(
            progress,
            progress.courseId
          )
      );

    /*
    |--------------------------------------------------------------------------
    | Course Title Search
    |--------------------------------------------------------------------------
    */

    if (searchText) {
      reports =
        reports.filter(
          (report) =>
            report.courseTitle
              .toLowerCase()
              .includes(
                searchText.toLowerCase()
              ) ||
            report.guestId
              .toLowerCase()
              .includes(
                searchText.toLowerCase()
              ) ||
            report.registration
              .toLowerCase()
              .includes(
                searchText.toLowerCase()
              )
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Result Filter
    |--------------------------------------------------------------------------
    |
    | Re-check after Storyline fallback.
    |--------------------------------------------------------------------------
    */

    if (
      result &&
      [
        "unknown",
        "passed",
        "failed",
      ].includes(result)
    ) {
      reports =
        reports.filter(
          (report) =>
            report.successStatus ===
            result
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Status Filter
    |--------------------------------------------------------------------------
    */

    if (
      status &&
      [
        "not_started",
        "in_progress",
        "completed",
      ].includes(status)
    ) {
      reports =
        reports.filter(
          (report) =>
            report.status ===
            status
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    */

    const totalAttempts =
      reports.length;

    const completedCount =
      reports.filter(
        (report) =>
          report.completed
      ).length;

    const passedCount =
      reports.filter(
        (report) =>
          report.successStatus ===
          "passed"
      ).length;

    const failedCount =
      reports.filter(
        (report) =>
          report.successStatus ===
          "failed"
      ).length;

    const inProgressCount =
      reports.filter(
        (report) =>
          report.status ===
          "in_progress"
      ).length;

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const total =
      reports.length;

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          total / perPage
        )
      );

    const startIndex =
      (currentPage - 1) *
      perPage;

    const paginatedReports =
      reports.slice(
        startIndex,
        startIndex + perPage
      );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      data: {
        summary: {
          totalAttempts,

          completed:
            completedCount,

          passed:
            passedCount,

          failed:
            failedCount,

          inProgress:
            inProgressCount,
        },

        pagination: {
          page:
            currentPage,

          limit:
            perPage,

          total,

          totalPages,
        },

        reports:
          paginatedReports,
      },
    });
  } catch (error) {
    console.error(
      "Get admin course reports error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load admin course reports",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  getGuestCourseReport,
  getAdminCourseReports,
};
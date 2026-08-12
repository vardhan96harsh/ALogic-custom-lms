const mongoose = require("mongoose");

const XapiStatement = require("../models/XapiStatement");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function durationToSeconds(duration) {
  if (
    !duration ||
    typeof duration !== "string"
  ) {
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
  );
}

function getActivityName(statement) {
  return (
    statement?.object?.definition?.name?.["en-US"] ||
    statement?.object?.definition?.name?.und ||
    statement?.object?.id ||
    ""
  );
}

/*
|--------------------------------------------------------------------------
| GET Guest Course Attempt Report
|--------------------------------------------------------------------------
|
| Example:
|
| GET
| /api/xapi/reports/:courseId/:guestId
| ?registration=...
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
        message: "guestId is required",
      });
    }

    const filter = {
      courseId,
      guestId,
    };

    if (registration) {
      filter.registration = registration;
    }

    const statements =
      await XapiStatement.find(filter)
        .sort({
          timestamp: 1,
          storedAt: 1,
        })
        .lean();

    if (statements.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No xAPI statements found",
      });
    }

    let totalDurationSeconds = 0;

    const moduleMap = new Map();

    const timeline =
      statements.map(
        (statement) => {
          const verb =
            getVerbName(statement);

          const activityName =
            getActivityName(statement);

          const duration =
            statement?.result?.duration ||
            "";

          const durationSeconds =
            durationToSeconds(duration);

          totalDurationSeconds +=
            durationSeconds;

          const objectType =
            statement?.object?.definition
              ?.type || "";

          const isModule =
            objectType ===
            "http://adlnet.gov/expapi/activities/module";

          if (isModule) {
            const moduleId =
              statement?.object?.id ||
              activityName;

            if (!moduleMap.has(moduleId)) {
              moduleMap.set(
                moduleId,
                {
                  moduleId,
                  moduleName:
                    activityName,
                  visits: 0,
                  durationSeconds: 0,
                  firstActivityAt: null,
                  lastActivityAt: null,
                }
              );
            }

            const module =
              moduleMap.get(
                moduleId
              );

            if (
              verb === "experienced" ||
              verb === "entered"
            ) {
              module.visits += 1;
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

            activityType:
              objectType,

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

    const registrations =
      [
        ...new Set(
          statements
            .map(
              (item) =>
                item.registration
            )
            .filter(Boolean)
        ),
      ];

    return res.status(200).json({
      success: true,

      data: {
        guestId,
        courseId,

        registration:
          registration ||
          registrations[0] ||
          "",

        totalStatements:
          statements.length,

        totalDurationSeconds:
          Number(
            totalDurationSeconds.toFixed(
              2
            )
          ),

        modulesVisited:
          modules.length,

        firstActivityAt:
          timeline[0]?.timestamp ||
          null,

        lastActivityAt:
          timeline[
            timeline.length - 1
          ]?.timestamp || null,

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

module.exports = {
  getGuestCourseReport,
};
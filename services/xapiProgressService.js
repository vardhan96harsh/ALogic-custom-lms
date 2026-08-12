const Course = require("../models/Course");
const CourseProgress = require("../models/CourseProgress");


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


function getVerb(statement) {
  return (
    statement?.verb?.display?.["en-US"] ||
    statement?.verb?.display?.und ||
    ""
  ).toLowerCase();
}


function getActivityName(statement) {
  return (
    statement?.object?.definition?.name?.["en-US"] ||
    statement?.object?.definition?.name?.und ||
    ""
  );
}


function getActivityType(statement) {
  return (
    statement?.object?.definition?.type ||
    ""
  );
}



/*
|--------------------------------------------------------------------------
| Update Course Progress From xAPI Statement
|--------------------------------------------------------------------------
*/

async function updateCourseProgressFromStatement({
  statement,
  courseId,
  guestId,
  registration,
}) {

  try {

    if (
      !statement ||
      !courseId ||
      !guestId ||
      !registration
    ) {
      return null;
    }


    const course =
      await Course.findById(courseId)
        .select("xapiConfig")
        .lean();



    const verb =
      getVerb(statement);


    const activityId =
      statement?.object?.id || "";


    const activityName =
      getActivityName(statement);



    const activityType =
      getActivityType(statement);



    const activityTime =
      statement?.timestamp
        ? new Date(statement.timestamp)
        : new Date();



    const durationSeconds =
      durationToSeconds(
        statement?.result?.duration
      );



    /*
    |--------------------------------------------------------------------------
    | Find / Create Progress
    |--------------------------------------------------------------------------
    */

    let progress =
      await CourseProgress.findOne({
        guestId,
        courseId,
        registration,
      });



    if (!progress) {

      progress =
        await CourseProgress.create({

          guestId,

          courseId,

          registration,


          status:
            "in_progress",


          firstActivityAt:
            activityTime,


          lastActivityAt:
            activityTime,


          lastActivityId:
            activityId,


          lastActivityName:
            activityName,


          lastVerb:
            verb,


          completionActivityId:
            course?.xapiConfig
              ?.completionActivityId ||
            "",


          completionActivityName:
            course?.xapiConfig
              ?.completionActivityName ||
            "",

        });

    }



    /*
    |--------------------------------------------------------------------------
    | Basic Activity Update
    |--------------------------------------------------------------------------
    */


    if (!progress.firstActivityAt) {

      progress.firstActivityAt =
        activityTime;

    }



    progress.lastActivityAt =
      activityTime;



    progress.lastActivityId =
      activityId;



    progress.lastActivityName =
      activityName;



    progress.lastVerb =
      verb;




    /*
    |--------------------------------------------------------------------------
    | Module Tracking
    |--------------------------------------------------------------------------
    */


    const isModule =
      activityType ===
      "http://adlnet.gov/expapi/activities/module";



    if (
      isModule &&
      (
        verb === "experienced" ||
        verb === "entered"
      )
    ) {


      if (
        activityId &&
        !progress.visitedModuleIds.includes(
          activityId
        )
      ) {

        progress.visitedModuleIds.push(
          activityId
        );


        progress.modulesVisited =
          progress.visitedModuleIds.length;

      }

    }



    /*
    |--------------------------------------------------------------------------
    | Duration
    |--------------------------------------------------------------------------
    */


    if (durationSeconds > 0) {

      progress.totalDurationSeconds +=
        durationSeconds;

    }




    /*
    |--------------------------------------------------------------------------
    | Native xAPI Completion
    |--------------------------------------------------------------------------
    */


    if (verb === "completed") {

      progress.status =
        "completed";


      progress.completed =
        true;


      if (!progress.completedAt) {

        progress.completedAt =
          activityTime;

      }

    }




    /*
    |--------------------------------------------------------------------------
    | Passed
    |--------------------------------------------------------------------------
    */


    if (verb === "passed") {

      progress.status =
        "completed";


      progress.completed =
        true;


      progress.successStatus =
        "passed";


      if (!progress.completedAt) {

        progress.completedAt =
          activityTime;

      }

    }




    /*
    |--------------------------------------------------------------------------
    | Failed
    |--------------------------------------------------------------------------
    */


    if (verb === "failed") {

      progress.status =
        "completed";


      progress.completed =
        true;


      progress.successStatus =
        "failed";


      if (!progress.completedAt) {

        progress.completedAt =
          activityTime;

      }

    }




    /*
    |--------------------------------------------------------------------------
    | Score
    |--------------------------------------------------------------------------
    */


    const score =
      statement?.result?.score;



    if (score) {

      if (typeof score.raw === "number") {
        progress.score.raw = score.raw;
      }


      if (typeof score.min === "number") {
        progress.score.min = score.min;
      }


      if (typeof score.max === "number") {
        progress.score.max = score.max;
      }


      if (typeof score.scaled === "number") {
        progress.score.scaled = score.scaled;
      }

    }




    /*
    |--------------------------------------------------------------------------
    | Completion Activity Detection
    |--------------------------------------------------------------------------
    |
    | Storyline does not send completed/passed.
    | It sends final module:
    |
    | STEP 1: COMPLETION
    |
    |--------------------------------------------------------------------------
    */


    const completionName =
      activityName
        .toLowerCase()
        .trim();



    if (

      completionName.includes(
        "completion"
      )

    ) {


      progress.status =
        "completed";


      progress.completed =
        true;


      if (!progress.completedAt) {

        progress.completedAt =
          activityTime;

      }


    }




    /*
    |--------------------------------------------------------------------------
    | Save Progress
    |--------------------------------------------------------------------------
    */


    await progress.save();


    return progress;


  } catch(error) {


    console.error(
      "Update xAPI course progress error:",
      error
    );


    return null;

  }

}



module.exports = {
  updateCourseProgressFromStatement,
};
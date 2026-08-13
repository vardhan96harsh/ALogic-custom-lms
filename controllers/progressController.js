const CourseProgress = require("../models/CourseProgress");


async function getCourseProgress(req, res) {

  try {

    const {
      courseId,
      guestId,
    } = req.params;


    if (!courseId || !guestId) {

      return res.status(400).json({

        success:false,

        message:
          "courseId and guestId are required",

      });

    }



    /*
    |--------------------------------------------------------------------------
    | Priority:
    | 1. Completed attempt
    | 2. Latest attempt
    |--------------------------------------------------------------------------
    */


    let progress =
      await CourseProgress.findOne({

        courseId,

        guestId,

        completed:true,

      })
      .sort({

        completedAt:-1,

      })
      .lean();




    if (!progress) {


      progress =
        await CourseProgress.findOne({

          courseId,

          guestId,

        })
        .sort({

          updatedAt:-1,

        })
        .lean();


    }




    if (!progress) {

      return res.status(404).json({

        success:false,

        message:
          "Course progress not found",

      });

    }




    return res.status(200).json({

      success:true,

      data:{

        guestId,

        courseId,


        registration:
          progress.registration,


        status:
          progress.status,


        completed:
          progress.completed,


        completedAt:
          progress.completedAt,


        successStatus:
          progress.successStatus,


        score:
          progress.score,


        completionPercentage:
          progress.completed
            ? 100
            : 0,


        modulesVisited:
          progress.modulesVisited,


        totalDurationSeconds:
          progress.totalDurationSeconds,


        lastActivityName:
          progress.lastActivityName,


        lastVerb:
          progress.lastVerb,


        firstActivityAt:
          progress.firstActivityAt,


        lastActivityAt:
          progress.lastActivityAt,


      }

    });



  }
  catch(error){


    console.error(
      "Get course progress error:",
      error
    );


    return res.status(500).json({

      success:false,

      message:
        "Unable to fetch course progress",

    });


  }

}



module.exports = {

  getCourseProgress,

};
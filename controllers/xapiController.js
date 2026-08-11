const mongoose = require("mongoose");

const XapiStatement = require("../models/XapiStatement");
const XapiState = require("../models/XapiState");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function extractGuestId(statement) {
  try {
    return (
      statement?.actor?.account?.name ||
      statement?.actor?.mbox ||
      statement?.actor?.name ||
      ""
    );
  } catch {
    return "";
  }
}

function parseAgent(agentValue) {
  if (!agentValue) {
    return null;
  }

  try {
    if (typeof agentValue === "string") {
      return JSON.parse(agentValue);
    }

    return agentValue;
  } catch {
    return null;
  }
}

function extractGuestIdFromAgent(agent) {
  if (!agent) {
    return "";
  }

  return (
    agent?.account?.name ||
    agent?.mbox ||
    agent?.name ||
    ""
  );
}

/*
|--------------------------------------------------------------------------
| Save One xAPI Statement
|--------------------------------------------------------------------------
*/

async function saveOneStatement(
  statement,
  courseId
) {
  const guestId =
    extractGuestId(statement);

  if (!guestId) {
    throw new Error(
      "Unable to identify guest user"
    );
  }

  const registration =
    statement?.context?.registration || "";

  const statementId =
    statement?.id || "";

  /*
  |--------------------------------------------------------------------------
  | Avoid duplicates
  |--------------------------------------------------------------------------
  |
  | xAPI PUT requests can send the same statementId.
  |
  */

  if (statementId) {
    const existing =
      await XapiStatement.findOne({
        statementId,
      });

    if (existing) {
      return existing;
    }
  }

  return XapiStatement.create({
    statementId,

    guestId,

    courseId,

    registration,

    actor:
      statement.actor || {},

    verb:
      statement.verb || {},

    object:
      statement.object || {},

    result:
      statement.result || {},

    context:
      statement.context || {},

    authority:
      statement.authority || {},

    attachments:
      statement.attachments || [],

    timestamp:
      statement.timestamp
        ? new Date(statement.timestamp)
        : null,

    storedAt: new Date(),

    rawStatement: statement,
  });
}

/*
|--------------------------------------------------------------------------
| POST / PUT Statements
|--------------------------------------------------------------------------
*/

async function saveXapiStatement(
  req,
  res
) {
  try {
    console.log(
      "REAL xAPI REQUEST RECEIVED"
    );

    console.log(
      "PARAMS:",
      req.params
    );

    console.log(
      "QUERY:",
      req.query
    );

    console.log(
      "METHOD:",
      req.method
    );

    console.log(
      "BODY:",
      JSON.stringify(
        req.body,
        null,
        2
      )
    );

    if (
      !req.body ||
      typeof req.body !== "object"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid xAPI statement",
      });
    }

    const statements =
      Array.isArray(req.body)
        ? req.body
        : [req.body];

    if (statements.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No xAPI statements received",
      });
    }

    const firstStatement =
      statements[0];

    const courseId =
      req.params.courseId ||
      req.headers["x-course-id"] ||
      req.query.courseId ||
      firstStatement?.context
        ?.extensions?.courseId ||
      "";

    if (
      !courseId ||
      !mongoose.Types.ObjectId.isValid(
        courseId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid courseId is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PUT statementId support
    |--------------------------------------------------------------------------
    */

    const statementIdFromQuery =
      req.query.statementId || "";

    if (
      req.method === "PUT" &&
      statementIdFromQuery &&
      statements.length === 1 &&
      !statements[0].id
    ) {
      statements[0].id =
        statementIdFromQuery;
    }

    const savedStatements = [];

    for (const statement of statements) {
      if (
        !statement ||
        typeof statement !== "object"
      ) {
        continue;
      }

      const saved =
        await saveOneStatement(
          statement,
          courseId
        );

      savedStatements.push(saved);
    }

    if (
      savedStatements.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No valid xAPI statements were received",
      });
    }

    const ids =
      savedStatements.map(
        (item) =>
          item.statementId ||
          item._id.toString()
      );

    /*
    |--------------------------------------------------------------------------
    | xAPI style response
    |--------------------------------------------------------------------------
    |
    | POST normally returns statement IDs.
    | PUT normally returns 204.
    |
    */

    if (req.method === "PUT") {
      return res
        .status(204)
        .end();
    }

    return res.status(200).json(
      ids
    );
  } catch (error) {
    console.error(
      "Save xAPI statement error:",
      error
    );

    if (
      error.message ===
      "Unable to identify guest user"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Unable to identify guest user",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to store xAPI statement",
    });
  }
}

/*
|--------------------------------------------------------------------------
| GET Activity State
|--------------------------------------------------------------------------
|
| Example:
|
| GET
| /api/xapi/:courseId/activities/state
| ?stateId=resume
| &activityId=...
| &agent=...
| &registration=...
|
|--------------------------------------------------------------------------
*/

async function getActivityState(
  req,
  res
) {
  try {
    const { courseId } = req.params;

    const {
      activityId,
      stateId,
      registration = "",
      agent: agentValue,
    } = req.query;

    if (
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

    if (!activityId) {
      return res.status(400).json({
        success: false,
        message:
          "activityId is required",
      });
    }

    if (!stateId) {
      return res.status(400).json({
        success: false,
        message:
          "stateId is required",
      });
    }

    const agent =
      parseAgent(agentValue);

    if (!agent) {
      return res.status(400).json({
        success: false,
        message:
          "Valid agent is required",
      });
    }

    const guestId =
      extractGuestIdFromAgent(
        agent
      );

    if (!guestId) {
      return res.status(400).json({
        success: false,
        message:
          "Unable to identify guest user",
      });
    }

    const state =
      await XapiState.findOne({
        courseId,
        activityId,
        stateId,
        registration,
        guestId,
      });

    /*
    |--------------------------------------------------------------------------
    | No saved state yet
    |--------------------------------------------------------------------------
    */

    if (!state) {
      return res
        .status(404)
        .end();
    }

    res.set(
      "Content-Type",
      state.contentType ||
        "application/json"
    );

    return res
      .status(200)
      .send(state.stateData);
  } catch (error) {
    console.error(
      "Get xAPI activity state error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve xAPI state",
    });
  }
}

/*
|--------------------------------------------------------------------------
| PUT Activity State
|--------------------------------------------------------------------------
*/

async function putActivityState(
  req,
  res
) {
  try {
    const { courseId } = req.params;

    const {
      activityId,
      stateId,
      registration = "",
      agent: agentValue,
    } = req.query;

    if (
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

    if (!activityId) {
      return res.status(400).json({
        success: false,
        message:
          "activityId is required",
      });
    }

    if (!stateId) {
      return res.status(400).json({
        success: false,
        message:
          "stateId is required",
      });
    }

    const agent =
      parseAgent(agentValue);

    if (!agent) {
      return res.status(400).json({
        success: false,
        message:
          "Valid agent is required",
      });
    }

    const guestId =
      extractGuestIdFromAgent(
        agent
      );

    if (!guestId) {
      return res.status(400).json({
        success: false,
        message:
          "Unable to identify guest user",
      });
    }

    const contentType =
      req.headers[
        "content-type"
      ] || "application/json";

    const stateData =
      req.body ?? {};

    await XapiState.findOneAndUpdate(
      {
        courseId,
        activityId,
        stateId,
        registration,
        guestId,
      },

      {
        $set: {
          agent,
          stateData,
          contentType,
          updatedByLrsAt:
            new Date(),
        },
      },

      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );

    return res
      .status(204)
      .end();
  } catch (error) {
    console.error(
      "Put xAPI activity state error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to save xAPI state",
    });
  }
}

/*
|--------------------------------------------------------------------------
| DELETE Activity State
|--------------------------------------------------------------------------
*/

async function deleteActivityState(
  req,
  res
) {
  try {
    const { courseId } = req.params;

    const {
      activityId,
      stateId,
      registration = "",
      agent: agentValue,
    } = req.query;

    if (
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

    if (!activityId) {
      return res.status(400).json({
        success: false,
        message:
          "activityId is required",
      });
    }

    const agent =
      parseAgent(agentValue);

    if (!agent) {
      return res.status(400).json({
        success: false,
        message:
          "Valid agent is required",
      });
    }

    const guestId =
      extractGuestIdFromAgent(
        agent
      );

    if (!guestId) {
      return res.status(400).json({
        success: false,
        message:
          "Unable to identify guest user",
      });
    }

    const filter = {
      courseId,
      activityId,
      registration,
      guestId,
    };

    /*
    |--------------------------------------------------------------------------
    | If stateId exists delete one state,
    | otherwise delete all states for activity/registration.
    |--------------------------------------------------------------------------
    */

    if (stateId) {
      filter.stateId = stateId;
    }

    await XapiState.deleteMany(
      filter
    );

    return res
      .status(204)
      .end();
  } catch (error) {
    console.error(
      "Delete xAPI activity state error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to delete xAPI state",
    });
  }
}

/*
|--------------------------------------------------------------------------
| GET xAPI Statement
|--------------------------------------------------------------------------
*/

async function getXapiStatement(req, res) {
  try {
    const { courseId } = req.params;
    const { statementId } = req.query;

    if (
      !courseId ||
      !mongoose.Types.ObjectId.isValid(courseId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid courseId",
      });
    }

    if (!statementId) {
      return res.status(400).json({
        success: false,
        message: "statementId is required",
      });
    }

    const statement = await XapiStatement.findOne({
      courseId,
      statementId,
    });

    if (!statement) {
      return res.status(404).end();
    }

    // xAPI endpoint should return the original xAPI statement,
    // not our MongoDB wrapper document.
    return res.status(200).json(
      statement.rawStatement
    );
  } catch (error) {
    console.error(
      "Get xAPI statement error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve xAPI statement",
    });
  }
}

/*
|--------------------------------------------------------------------------
| GET xAPI About
|--------------------------------------------------------------------------
*/

async function getXapiAbout(req, res) {
  try {
    return res.status(200).json({
      version: ["1.0.3"],
      extensions: {},
    });
  } catch (error) {
    console.error(
      "Get xAPI about error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve xAPI about information",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  saveXapiStatement,
  getXapiStatement,
  getXapiAbout,

  getActivityState,
  putActivityState,
  deleteActivityState,
};
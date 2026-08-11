const express = require("express");

const {
  saveXapiStatement,
  getXapiStatement,
  getXapiAbout,
  getActivityState,
  putActivityState,
  deleteActivityState,
} = require("../controllers/xapiController");

const router = express.Router();

router.use((req, res, next) => {
  res.setHeader(
    "X-Experience-API-Version",
    "1.0.3"
  );

  res.setHeader(
    "Access-Control-Expose-Headers",
    "X-Experience-API-Version"
  );

  next();
});

router.get(
  "/about",
  getXapiAbout
);

router.get(
  "/:courseId/statements",
  getXapiStatement
);

router.post(
  "/:courseId/statements",
  saveXapiStatement
);

router.put(
  "/:courseId/statements",
  saveXapiStatement
);

router.get(
  "/:courseId/activities/state",
  getActivityState
);

router.put(
  "/:courseId/activities/state",
  putActivityState
);

router.delete(
  "/:courseId/activities/state",
  deleteActivityState
);

module.exports = router;
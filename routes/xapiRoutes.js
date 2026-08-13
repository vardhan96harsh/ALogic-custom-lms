const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  saveXapiStatement,
  getXapiStatement,
  getXapiAbout,
  getActivityState,
  putActivityState,
  deleteActivityState,
} = require("../controllers/xapiController");

const {
  getGuestCourseReport,
  getAdminCourseReports,
} = require("../controllers/xapiReportController");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| xAPI Headers
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| xAPI About
|--------------------------------------------------------------------------
*/

router.get(
  "/about",
  getXapiAbout
);

/*
|--------------------------------------------------------------------------
| ADMIN COURSE REPORTS
|--------------------------------------------------------------------------
|
| Only logged-in admin users can access this.
|
| GET:
| /api/xapi/admin/reports
|
|--------------------------------------------------------------------------
*/

router.get(
  "/admin/reports",
  authMiddleware,
  adminMiddleware,
  getAdminCourseReports
);

/*
|--------------------------------------------------------------------------
| ADMIN INDIVIDUAL GUEST REPORT
|--------------------------------------------------------------------------
|
| Only logged-in admin users can access this.
|
| GET:
| /api/xapi/reports/:courseId/:guestId
|
|--------------------------------------------------------------------------
*/

router.get(
  "/reports/:courseId/:guestId",
  authMiddleware,
  adminMiddleware,
  getGuestCourseReport
);

/*
|--------------------------------------------------------------------------
| STORYLINE xAPI STATEMENTS
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| DO NOT add authMiddleware/adminMiddleware here.
|
| Storyline needs these endpoints to send xAPI statements
| while the learner is taking the course.
|
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| xAPI Activity State
|--------------------------------------------------------------------------
*/

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
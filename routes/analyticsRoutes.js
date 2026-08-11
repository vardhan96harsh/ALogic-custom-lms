const express = require("express");

const {
  createAnalyticsEvent,
} = require("../controllers/analyticsController");

const {
  getAnalyticsOverview,
  getTrafficAnalytics,
  getDeviceAnalytics,
  getPageAnalytics,
  getCourseAnalytics,
  getVisitors,
  getVisitorDetails,
  getAnalyticsTrends,
   getEngagementAnalytics

} = require("../controllers/analyticsDashboardController");

const router = express.Router();

router.post(
  "/events",
  createAnalyticsEvent
);

router.get(
  "/dashboard/overview",
  getAnalyticsOverview
);

router.get(
  "/dashboard/traffic",
  getTrafficAnalytics
);

router.get(
  "/dashboard/devices",
  getDeviceAnalytics
);

router.get(
  "/dashboard/pages",
  getPageAnalytics
);

router.get(
  "/dashboard/courses",
  getCourseAnalytics
);

router.get(
  "/dashboard/visitors",
  getVisitors
);

router.get(
  "/dashboard/visitors/:guestId",
  getVisitorDetails
);

router.get(
  "/dashboard/trends",
  getAnalyticsTrends
);
router.get(
  "/dashboard/engagement",
  getEngagementAnalytics
);

module.exports = router;
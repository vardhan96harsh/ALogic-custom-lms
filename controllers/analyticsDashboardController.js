const AnalyticsSession = require("../models/AnalyticsSession");
const AnalyticsVisitor = require("../models/AnalyticsVisitor");
const AnalyticsEvent = require("../models/AnalyticsEvent");

async function getAnalyticsOverview(req, res) {
  try {
    const totalVisitors =
      await AnalyticsVisitor.countDocuments();

    const returningVisitors =
      await AnalyticsVisitor.countDocuments({
        isReturningVisitor: true,
      });

    const newVisitors =
      totalVisitors - returningVisitors;

    const totalSessions =
      await AnalyticsSession.countDocuments();

    const visitorTotals =
      await AnalyticsVisitor.aggregate([
        {
          $group: {
            _id: null,

            totalPageViews: {
              $sum: "$totalPageViews",
            },

            totalCourseViews: {
              $sum: "$totalCourseViews",
            },

            totalCourseLaunches: {
              $sum: "$totalCourseLaunches",
            },

            totalActiveDurationSeconds: {
              $sum: "$totalActiveDurationSeconds",
            },
          },
        },
      ]);

    const totals = visitorTotals[0] || {
      totalPageViews: 0,
      totalCourseViews: 0,
      totalCourseLaunches: 0,
      totalActiveDurationSeconds: 0,
    };

    const sessionDurationResult =
      await AnalyticsSession.aggregate([
        {
          $group: {
            _id: null,

            averageActiveSessionSeconds: {
              $avg: "$activeDurationSeconds",
            },
          },
        },
      ]);

    const averageActiveSessionSeconds =
      sessionDurationResult[0]
        ?.averageActiveSessionSeconds || 0;

    const returningVisitorPercentage =
      totalVisitors > 0
        ? Number(
            (
              (returningVisitors /
                totalVisitors) *
              100
            ).toFixed(2)
          )
        : 0;

    const courseLaunchConversionRate =
      totals.totalCourseViews > 0
        ? Number(
            (
              (totals.totalCourseLaunches /
                totals.totalCourseViews) *
              100
            ).toFixed(2)
          )
        : 0;

    return res.status(200).json({
      success: true,

      data: {
        totalVisitors,
        newVisitors,
        returningVisitors,
        returningVisitorPercentage,

        totalSessions,

        totalPageViews:
          totals.totalPageViews,

        totalCourseViews:
          totals.totalCourseViews,

        totalCourseLaunches:
          totals.totalCourseLaunches,

        totalActiveDurationSeconds:
          totals.totalActiveDurationSeconds,

        averageActiveSessionSeconds:
          Math.round(
            averageActiveSessionSeconds
          ),

        courseLaunchConversionRate,
      },
    });
  } catch (error) {
    console.error(
      "Get analytics overview error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch analytics overview",
    });
  }
}

async function getTrafficAnalytics(req, res) {
  try {
    const trafficSources =
      await AnalyticsSession.aggregate([
        {
          $group: {
            _id: {
              source: {
                $ifNull: ["$source", "direct"],
              },

              medium: {
                $ifNull: ["$medium", "none"],
              },
            },

            sessions: {
              $sum: 1,
            },

            visitors: {
              $addToSet: "$guestId",
            },

            pageViews: {
              $sum: "$pageViews",
            },

            courseViews: {
              $sum: "$courseViews",
            },

            courseLaunches: {
              $sum: "$courseLaunches",
            },

            activeDurationSeconds: {
              $sum: "$activeDurationSeconds",
            },
          },
        },

        {
          $project: {
            _id: 0,

            source: "$_id.source",
            medium: "$_id.medium",

            sessions: 1,

            visitors: {
              $size: "$visitors",
            },

            pageViews: 1,
            courseViews: 1,
            courseLaunches: 1,
            activeDurationSeconds: 1,
          },
        },

        {
          $sort: {
            sessions: -1,
          },
        },
      ]);

    const campaigns =
      await AnalyticsSession.aggregate([
        {
          $match: {
            campaign: {
              $nin: ["", null],
            },
          },
        },

        {
          $group: {
            _id: "$campaign",

            sessions: {
              $sum: 1,
            },

            visitors: {
              $addToSet: "$guestId",
            },

            pageViews: {
              $sum: "$pageViews",
            },

            courseViews: {
              $sum: "$courseViews",
            },

            courseLaunches: {
              $sum: "$courseLaunches",
            },
          },
        },

        {
          $project: {
            _id: 0,
            campaign: "$_id",
            sessions: 1,

            visitors: {
              $size: "$visitors",
            },

            pageViews: 1,
            courseViews: 1,
            courseLaunches: 1,
          },
        },

        {
          $sort: {
            sessions: -1,
          },
        },
      ]);

    const referrers =
      await AnalyticsSession.aggregate([
        {
          $match: {
            referrerDomain: {
              $nin: ["", null],
            },
          },
        },

        {
          $group: {
            _id: "$referrerDomain",

            sessions: {
              $sum: 1,
            },

            visitors: {
              $addToSet: "$guestId",
            },
          },
        },

        {
          $project: {
            _id: 0,

            referrerDomain: "$_id",
            sessions: 1,

            visitors: {
              $size: "$visitors",
            },
          },
        },

        {
          $sort: {
            sessions: -1,
          },
        },
      ]);

    const totalSessions =
      trafficSources.reduce(
        (sum, item) => sum + item.sessions,
        0
      );

    const sources =
      trafficSources.map((item) => ({
        ...item,

        percentage:
          totalSessions > 0
            ? Number(
                (
                  (item.sessions /
                    totalSessions) *
                  100
                ).toFixed(2)
              )
            : 0,
      }));

    return res.status(200).json({
      success: true,

      data: {
        totalSessions,
        sources,
        campaigns,
        referrers,
      },
    });
  } catch (error) {
    console.error(
      "Get traffic analytics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch traffic analytics",
    });
  }
}

async function getDeviceAnalytics(req, res) {
  try {
    const devices =
      await AnalyticsSession.aggregate([
        {
          $group: {
            _id: {
              $ifNull: [
                "$deviceType",
                "unknown",
              ],
            },

            sessions: {
              $sum: 1,
            },

            visitors: {
              $addToSet: "$guestId",
            },

            pageViews: {
              $sum: "$pageViews",
            },

            activeDurationSeconds: {
              $sum: "$activeDurationSeconds",
            },
          },
        },

        {
          $project: {
            _id: 0,
            deviceType: "$_id",
            sessions: 1,

            visitors: {
              $size: "$visitors",
            },

            pageViews: 1,
            activeDurationSeconds: 1,
          },
        },

        {
          $sort: {
            sessions: -1,
          },
        },
      ]);

    const browsers =
      await AnalyticsSession.aggregate([
        {
          $group: {
            _id: {
              $ifNull: [
                "$browser",
                "Unknown",
              ],
            },

            sessions: {
              $sum: 1,
            },

            visitors: {
              $addToSet: "$guestId",
            },
          },
        },

        {
          $project: {
            _id: 0,
            browser: "$_id",
            sessions: 1,

            visitors: {
              $size: "$visitors",
            },
          },
        },

        {
          $sort: {
            sessions: -1,
          },
        },
      ]);

    const operatingSystems =
      await AnalyticsSession.aggregate([
        {
          $group: {
            _id: {
              $ifNull: [
                "$operatingSystem",
                "Unknown",
              ],
            },

            sessions: {
              $sum: 1,
            },

            visitors: {
              $addToSet: "$guestId",
            },
          },
        },

        {
          $project: {
            _id: 0,

            operatingSystem: "$_id",
            sessions: 1,

            visitors: {
              $size: "$visitors",
            },
          },
        },

        {
          $sort: {
            sessions: -1,
          },
        },
      ]);

    const totalSessions =
      devices.reduce(
        (sum, item) => sum + item.sessions,
        0
      );

    const devicesWithPercentage =
      devices.map((item) => ({
        ...item,

        percentage:
          totalSessions > 0
            ? Number(
                (
                  (item.sessions /
                    totalSessions) *
                  100
                ).toFixed(2)
              )
            : 0,
      }));

    return res.status(200).json({
      success: true,

      data: {
        totalSessions,
        devices: devicesWithPercentage,
        browsers,
        operatingSystems,
      },
    });
  } catch (error) {
    console.error(
      "Get device analytics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch device analytics",
    });
  }
}

async function getPageAnalytics(req, res) {
  try {
    const pages = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: {
            $in: ["page_view", "page_time"],
          },
          pagePath: {
            $nin: ["", null],
          },
        },
      },

      {
        $group: {
          _id: "$pagePath",

          pageTitle: {
            $last: "$pageTitle",
          },

          pageViews: {
            $sum: {
              $cond: [
                {
                  $eq: ["$eventType", "page_view"],
                },
                1,
                0,
              ],
            },
          },

          activeDurationSeconds: {
            $sum: {
              $cond: [
                {
                  $eq: ["$eventType", "page_time"],
                },
                "$durationSeconds",
                0,
              ],
            },
          },

          visitors: {
            $addToSet: "$guestId",
          },

          sessions: {
            $addToSet: "$sessionId",
          },

          lastVisitedAt: {
            $max: "$createdAt",
          },
        },
      },

      {
        $project: {
          _id: 0,

          pagePath: "$_id",
          pageTitle: 1,
          pageViews: 1,
          activeDurationSeconds: 1,

          uniqueVisitors: {
            $size: "$visitors",
          },

          uniqueSessions: {
            $size: "$sessions",
          },

          averageActiveTimeSeconds: {
            $cond: [
              {
                $gt: ["$pageViews", 0],
              },
              {
                $round: [
                  {
                    $divide: [
                      "$activeDurationSeconds",
                      "$pageViews",
                    ],
                  },
                  0,
                ],
              },
              0,
            ],
          },

          lastVisitedAt: 1,
        },
      },

      {
        $sort: {
          pageViews: -1,
        },
      },

      {
        $limit: 50,
      },
    ]);

    const totalPageViews = pages.reduce(
      (sum, page) => sum + page.pageViews,
      0
    );

    const totalActiveDurationSeconds = pages.reduce(
      (sum, page) =>
        sum + page.activeDurationSeconds,
      0
    );

    const pagesWithPercentage = pages.map(
      (page) => ({
        ...page,

        viewPercentage:
          totalPageViews > 0
            ? Number(
                (
                  (page.pageViews /
                    totalPageViews) *
                  100
                ).toFixed(2)
              )
            : 0,
      })
    );

    return res.status(200).json({
      success: true,

      data: {
        totalPageViews,
        totalActiveDurationSeconds,
        pages: pagesWithPercentage,
      },
    });
  } catch (error) {
    console.error(
      "Get page analytics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch page analytics",
    });
  }
}

async function getCourseAnalytics(req, res) {
  try {
    const courses = await AnalyticsEvent.aggregate([
      {
        $match: {
          eventType: {
            $in: [
              "course_view",
              "course_launch",
              "page_time",
            ],
          },
          courseId: {
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: "$courseId",

          courseTitle: {
            $last: "$metadata.courseTitle",
          },

          courseViews: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$eventType",
                    "course_view",
                  ],
                },
                1,
                0,
              ],
            },
          },

          courseLaunches: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$eventType",
                    "course_launch",
                  ],
                },
                1,
                0,
              ],
            },
          },

          activeDurationSeconds: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$eventType",
                    "page_time",
                  ],
                },
                "$durationSeconds",
                0,
              ],
            },
          },

          visitors: {
            $addToSet: "$guestId",
          },

          sessions: {
            $addToSet: "$sessionId",
          },

          lastActivityAt: {
            $max: "$createdAt",
          },
        },
      },
      {
        $project: {
          _id: 0,

          courseId: "$_id",
          courseTitle: 1,
          courseViews: 1,
          courseLaunches: 1,
          activeDurationSeconds: 1,

          uniqueVisitors: {
            $size: "$visitors",
          },

          uniqueSessions: {
            $size: "$sessions",
          },

          launchConversionRate: {
            $cond: [
              {
                $gt: [
                  "$courseViews",
                  0,
                ],
              },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          "$courseLaunches",
                          "$courseViews",
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
              0,
            ],
          },

          averageViewingTimeSeconds: {
            $cond: [
              {
                $gt: [
                  "$courseViews",
                  0,
                ],
              },
              {
                $round: [
                  {
                    $divide: [
                      "$activeDurationSeconds",
                      "$courseViews",
                    ],
                  },
                  0,
                ],
              },
              0,
            ],
          },

          lastActivityAt: 1,
        },
      },
      {
        $sort: {
          courseViews: -1,
          courseLaunches: -1,
        },
      },
    ]);

    const totalCourseViews = courses.reduce(
      (sum, course) =>
        sum + course.courseViews,
      0
    );

    const totalCourseLaunches = courses.reduce(
      (sum, course) =>
        sum + course.courseLaunches,
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        totalCourseViews,
        totalCourseLaunches,
        courses,
      },
    });
  } catch (error) {
    console.error(
      "Get course analytics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch course analytics",
    });
  }
}

async function getVisitors(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 20)
    );

    const skip = (page - 1) * limit;

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const filter = {};

    if (search) {
      filter.$or = [
        {
          guestId: {
            $regex: search,
            $options: "i",
          },
        },
        {
          latestSource: {
            $regex: search,
            $options: "i",
          },
        },
        {
          country: {
            $regex: search,
            $options: "i",
          },
        },
        {
          city: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const [visitors, totalVisitors] =
      await Promise.all([
        AnalyticsVisitor.find(filter)
          .sort({
            lastSeenAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        AnalyticsVisitor.countDocuments(filter),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        visitors,
        pagination: {
          page,
          limit,
          totalVisitors,
          totalPages: Math.ceil(
            totalVisitors / limit
          ),
        },
      },
    });
  } catch (error) {
    console.error(
      "Get analytics visitors error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch analytics visitors",
    });
  }
}
async function getVisitorDetails(req, res) {
  try {
    const { guestId } = req.params;

    if (!guestId) {
      return res.status(400).json({
        success: false,
        message: "guestId is required",
      });
    }

    const visitor =
      await AnalyticsVisitor.findOne({
        guestId,
      }).lean();

    if (!visitor) {
      return res.status(404).json({
        success: false,
        message: "Visitor not found",
      });
    }

    const [sessions, events] =
      await Promise.all([
        AnalyticsSession.find({
          guestId,
        })
          .sort({
            startedAt: -1,
          })
          .lean(),

        AnalyticsEvent.find({
          guestId,
        })
          .sort({
            createdAt: 1,
          })
          .limit(500)
          .lean(),
      ]);

    const journey = events.map((event) => ({
      eventId: event._id,
      sessionId: event.sessionId,
      eventType: event.eventType,
      pagePath: event.pagePath,
      pageTitle: event.pageTitle,
      courseId: event.courseId,
      durationSeconds:
        event.durationSeconds,
      progressPercentage:
        event.progressPercentage,
      source: event.source,
      medium: event.medium,
      metadata: event.metadata,
      createdAt: event.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        visitor,
        sessions,
        journey,
      },
    });
  } catch (error) {
    console.error(
      "Get visitor details error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch visitor details",
    });
  }
}

async function getAnalyticsTrends(req, res) {
  try {
    const days = Math.min(
      365,
      Math.max(1, Number(req.query.days) || 30)
    );

    const startDate = new Date();

    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));

    const visitorTrends =
      await AnalyticsVisitor.aggregate([
        {
          $match: {
            firstSeenAt: {
              $gte: startDate,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$firstSeenAt",
              },
            },
            newVisitors: {
              $sum: 1,
            },
          },
        },
      ]);

    const sessionTrends =
      await AnalyticsSession.aggregate([
        {
          $match: {
            startedAt: {
              $gte: startDate,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$startedAt",
              },
            },
            sessions: {
              $sum: 1,
            },
            activeDurationSeconds: {
              $sum: "$activeDurationSeconds",
            },
          },
        },
      ]);

    const eventTrends =
      await AnalyticsEvent.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
            },
            eventType: {
              $in: [
                "page_view",
                "course_view",
                "course_launch",
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },
              eventType: "$eventType",
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]);

    const visitorMap = new Map(
      visitorTrends.map((item) => [
        item._id,
        item.newVisitors,
      ])
    );

    const sessionMap = new Map(
      sessionTrends.map((item) => [
        item._id,
        {
          sessions: item.sessions,
          activeDurationSeconds:
            item.activeDurationSeconds,
        },
      ])
    );

    const eventMap = new Map();

    for (const item of eventTrends) {
      const date = item._id.date;

      if (!eventMap.has(date)) {
        eventMap.set(date, {
          pageViews: 0,
          courseViews: 0,
          courseLaunches: 0,
        });
      }

      const current = eventMap.get(date);

      if (item._id.eventType === "page_view") {
        current.pageViews = item.count;
      }

      if (item._id.eventType === "course_view") {
        current.courseViews = item.count;
      }

      if (item._id.eventType === "course_launch") {
        current.courseLaunches = item.count;
      }
    }

    const trends = [];

    for (let index = 0; index < days; index += 1) {
      const date = new Date(startDate);

      date.setDate(startDate.getDate() + index);

      const dateKey = date
        .toISOString()
        .slice(0, 10);

      const sessionData =
        sessionMap.get(dateKey) || {
          sessions: 0,
          activeDurationSeconds: 0,
        };

      const eventData =
        eventMap.get(dateKey) || {
          pageViews: 0,
          courseViews: 0,
          courseLaunches: 0,
        };

      trends.push({
        date: dateKey,
        newVisitors:
          visitorMap.get(dateKey) || 0,
        sessions: sessionData.sessions,
        activeDurationSeconds:
          sessionData.activeDurationSeconds,
        pageViews: eventData.pageViews,
        courseViews: eventData.courseViews,
        courseLaunches:
          eventData.courseLaunches,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        days,
        startDate,
        endDate: new Date(),
        trends,
      },
    });
  } catch (error) {
    console.error(
      "Get analytics trends error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch analytics trends",
    });
  }
}

async function getEngagementAnalytics(req, res) {
  try {
    const totalSessions =
      await AnalyticsSession.countDocuments();

    const sessionSummary =
      await AnalyticsSession.aggregate([
        {
          $group: {
            _id: null,

            totalPageViews: {
              $sum: "$pageViews",
            },

            totalCourseViews: {
              $sum: "$courseViews",
            },

            totalCourseLaunches: {
              $sum: "$courseLaunches",
            },

            totalActiveDurationSeconds: {
              $sum: "$activeDurationSeconds",
            },

            averageSessionDurationSeconds: {
              $avg: "$activeDurationSeconds",
            },

            bouncedSessions: {
              $sum: {
                $cond: [
                  {
                    $lte: ["$pageViews", 1],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

    const summary = sessionSummary[0] || {
      totalPageViews: 0,
      totalCourseViews: 0,
      totalCourseLaunches: 0,
      totalActiveDurationSeconds: 0,
      averageSessionDurationSeconds: 0,
      bouncedSessions: 0,
    };

    const averagePagesPerSession =
      totalSessions > 0
        ? Number(
            (
              summary.totalPageViews /
              totalSessions
            ).toFixed(2)
          )
        : 0;

    const averageCourseViewsPerSession =
      totalSessions > 0
        ? Number(
            (
              summary.totalCourseViews /
              totalSessions
            ).toFixed(2)
          )
        : 0;

    const bounceRate =
      totalSessions > 0
        ? Number(
            (
              (summary.bouncedSessions /
                totalSessions) *
              100
            ).toFixed(2)
          )
        : 0;

    const courseLaunchConversionRate =
      summary.totalCourseViews > 0
        ? Number(
            (
              (summary.totalCourseLaunches /
                summary.totalCourseViews) *
              100
            ).toFixed(2)
          )
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalSessions,

        totalPageViews:
          summary.totalPageViews,

        totalCourseViews:
          summary.totalCourseViews,

        totalCourseLaunches:
          summary.totalCourseLaunches,

        totalActiveDurationSeconds:
          summary.totalActiveDurationSeconds,

        averageSessionDurationSeconds:
          Math.round(
            summary.averageSessionDurationSeconds
          ),

        averagePagesPerSession,

        averageCourseViewsPerSession,

        bouncedSessions:
          summary.bouncedSessions,

        bounceRate,

        courseLaunchConversionRate,
      },
    });
  } catch (error) {
    console.error(
      "Get engagement analytics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch engagement analytics",
    });
  }
}

module.exports = {
  getAnalyticsOverview,
  getTrafficAnalytics,
  getDeviceAnalytics,
  getPageAnalytics,
  getCourseAnalytics,
  getVisitors,
  getVisitorDetails,
  getAnalyticsTrends,
  getEngagementAnalytics,
};
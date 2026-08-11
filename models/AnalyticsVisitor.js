const mongoose = require("mongoose");

const analyticsVisitorSchema = new mongoose.Schema(
  {
    guestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    firstSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    totalSessions: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalPageViews: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCourseViews: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalCourseLaunches: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalActiveDurationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    firstSource: {
      type: String,
      default: "direct",
      trim: true,
      index: true,
    },

    firstMedium: {
      type: String,
      default: "none",
      trim: true,
    },

    firstCampaign: {
      type: String,
      default: "",
      trim: true,
    },

    firstLandingPage: {
      type: String,
      default: "",
      trim: true,
    },

    latestSource: {
      type: String,
      default: "direct",
      trim: true,
      index: true,
    },

    latestMedium: {
      type: String,
      default: "none",
      trim: true,
    },

    latestCampaign: {
      type: String,
      default: "",
      trim: true,
    },

    latestLandingPage: {
      type: String,
      default: "",
      trim: true,
    },

    latestPagePath: {
      type: String,
      default: "",
      trim: true,
    },

    deviceType: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "unknown"],
      default: "unknown",
      index: true,
    },

    browser: {
      type: String,
      default: "Unknown",
      trim: true,
    },

    operatingSystem: {
      type: String,
      default: "Unknown",
      trim: true,
    },

    screenResolution: {
      type: String,
      default: "",
      trim: true,
    },

    language: {
      type: String,
      default: "",
      trim: true,
    },

    timezone: {
      type: String,
      default: "",
      trim: true,
    },

    country: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    region: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    isReturningVisitor: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

analyticsVisitorSchema.index({
  firstSeenAt: -1,
});

analyticsVisitorSchema.index({
  lastSeenAt: -1,
});

analyticsVisitorSchema.index({
  latestSource: 1,
  lastSeenAt: -1,
});

analyticsVisitorSchema.index({
  deviceType: 1,
  lastSeenAt: -1,
});

module.exports = mongoose.model(
  "AnalyticsVisitor",
  analyticsVisitorSchema
);
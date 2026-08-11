const mongoose = require("mongoose");

const analyticsSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    guestId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    activeDurationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    pageViews: {
      type: Number,
      default: 0,
      min: 0,
    },

    courseViews: {
      type: Number,
      default: 0,
      min: 0,
    },

    courseLaunches: {
      type: Number,
      default: 0,
      min: 0,
    },

    landingPage: {
      type: String,
      default: "",
      trim: true,
    },

    exitPage: {
      type: String,
      default: "",
      trim: true,
    },

    source: {
      type: String,
      default: "direct",
      trim: true,
      index: true,
    },

    medium: {
      type: String,
      default: "none",
      trim: true,
    },

    campaign: {
      type: String,
      default: "",
      trim: true,
    },

    referrerUrl: {
      type: String,
      default: "",
      trim: true,
    },

    referrerDomain: {
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

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

analyticsSessionSchema.index({
  guestId: 1,
  startedAt: -1,
});

analyticsSessionSchema.index({
  source: 1,
  startedAt: -1,
});

analyticsSessionSchema.index({
  deviceType: 1,
  startedAt: -1,
});

module.exports = mongoose.model(
  "AnalyticsSession",
  analyticsSessionSchema
);
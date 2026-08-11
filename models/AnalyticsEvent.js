const mongoose = require("mongoose");

const analyticsEventSchema = new mongoose.Schema(
  {
    guestId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    sessionId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    eventType: {
      type: String,
      required: true,
      index: true,
      trim: true,
      enum: [
        "session_start",
        "session_end",
        "page_view",
        "page_time",
        "course_view",
        "course_launch",
        "course_like",
        "video_play",
        "video_pause",
        "video_progress",
        "video_complete",
        "search",
        "filter_used",
        "button_click",
        "scroll_depth",
        "resource_download",
      ],
    },

    pagePath: {
      type: String,
      default: "",
      trim: true,
    },

    pageTitle: {
      type: String,
      default: "",
      trim: true,
    },

    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
      index: true,
    },

    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
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

    content: {
      type: String,
      default: "",
      trim: true,
    },

    term: {
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

    landingPage: {
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

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

analyticsEventSchema.index({
  guestId: 1,
  createdAt: -1,
});

analyticsEventSchema.index({
  sessionId: 1,
  createdAt: -1,
});

analyticsEventSchema.index({
  eventType: 1,
  createdAt: -1,
});

analyticsEventSchema.index({
  courseId: 1,
  eventType: 1,
  createdAt: -1,
});

module.exports = mongoose.model("AnalyticsEvent", analyticsEventSchema);
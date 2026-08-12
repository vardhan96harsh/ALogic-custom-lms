const mongoose = require("mongoose");

const courseProgressSchema =
  new mongoose.Schema(
    {
      guestId: {
        type: String,
        required: true,
        index: true,
        trim: true,
      },

      courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
        index: true,
      },

      registration: {
        type: String,
        required: true,
        index: true,
        trim: true,
      },

      status: {
        type: String,
        enum: [
          "not_started",
          "in_progress",
          "completed",
        ],
        default: "in_progress",
        index: true,
      },

      completed: {
        type: Boolean,
        default: false,
        index: true,
      },

      completedAt: {
        type: Date,
        default: null,
      },

      successStatus: {
        type: String,
        enum: [
          "unknown",
          "passed",
          "failed",
        ],
        default: "unknown",
        index: true,
      },

      score: {
        raw: {
          type: Number,
          default: null,
        },

        min: {
          type: Number,
          default: null,
        },

        max: {
          type: Number,
          default: null,
        },

        scaled: {
          type: Number,
          default: null,
        },
      },

      modulesVisited: {
        type: Number,
        default: 0,
      },

      visitedModuleIds: {
        type: [String],
        default: [],
      },

      totalDurationSeconds: {
        type: Number,
        default: 0,
      },

      firstActivityAt: {
        type: Date,
        default: null,
      },

      lastActivityAt: {
        type: Date,
        default: null,
        index: true,
      },

      lastActivityId: {
        type: String,
        default: "",
      },

      lastActivityName: {
        type: String,
        default: "",
      },

      lastVerb: {
        type: String,
        default: "",
      },

      completionActivityId: {
        type: String,
        default: "",
      },

      completionActivityName: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

courseProgressSchema.index(
  {
    guestId: 1,
    courseId: 1,
    registration: 1,
  },
  {
    unique: true,
  }
);

courseProgressSchema.index({
  courseId: 1,
  status: 1,
  updatedAt: -1,
});

module.exports = mongoose.model(
  "CourseProgress",
  courseProgressSchema
);
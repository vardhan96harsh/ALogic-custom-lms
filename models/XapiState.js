const mongoose = require("mongoose");

const xapiStateSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },

    activityId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    stateId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    registration: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },

    guestId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    agent: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    stateData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    contentType: {
      type: String,
      default: "application/json",
      trim: true,
    },

    updatedByLrsAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

xapiStateSchema.index(
  {
    courseId: 1,
    activityId: 1,
    stateId: 1,
    registration: 1,
    guestId: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "XapiState",
  xapiStateSchema
);
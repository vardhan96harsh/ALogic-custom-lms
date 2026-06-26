const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
    },
    scormFile: {
      type: String,
    },
    scormPath: {
      type: String,
    },
    launchUrl: {
      type: String,
    },
    views: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: "Active",
    },
      whatYouWillLearn: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    outcomes: { type: [String], default: [] },
    targetAudience: { type: [String], default: [] },
    curriculum: { type: Array, default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
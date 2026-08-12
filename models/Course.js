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

    whatYouWillLearn: {
      type: [String],
      default: [],
    },

    skills: {
      type: [String],
      default: [],
    },

    outcomes: {
      type: [String],
      default: [],
    },

    targetAudience: {
      type: [String],
      default: [],
    },

    curriculum: {
      type: Array,
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | xAPI / Storyline Completion Configuration
    |--------------------------------------------------------------------------
    |
    | Different Storyline courses can have different completion slides.
    |
    | Example:
    | urn:articulate:storyline:6DfbOtiw4MC/6EjZihcZn6U
    |
    */

    xapiConfig: {
      completionActivityId: {
        type: String,
        default: "",
        trim: true,
      },

      completionActivityName: {
        type: String,
        default: "",
        trim: true,
      },

      completionVerb: {
        type: String,
        default: "experienced",
        trim: true,
      },

      totalModules: {
        type: Number,
        default: 0,
      },
    },
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Course",
  courseSchema
);
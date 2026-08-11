const mongoose = require("mongoose");

const xapiStatementSchema = new mongoose.Schema(
  {
    statementId: {
      type: String,
      default: "",
      trim: true,
    },

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
      default: "",
      index: true,
      trim: true,
    },

    actor: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    verb: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    object: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    result: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    context: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    authority: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    attachments: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    timestamp: {
      type: Date,
      default: null,
      index: true,
    },

    storedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    rawStatement: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

xapiStatementSchema.index({
  guestId: 1,
  courseId: 1,
  storedAt: -1,
});

xapiStatementSchema.index({
  registration: 1,
  storedAt: -1,
});

xapiStatementSchema.index({
  "verb.id": 1,
  storedAt: -1,
});

xapiStatementSchema.index(
  { statementId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      statementId: {
        $type: "string",
        $ne: "",
      },
    },
  }
);

module.exports = mongoose.model(
  "XapiStatement",
  xapiStatementSchema
);
const mongoose = require("mongoose");

const AnalyticsEvent = require("../models/AnalyticsEvent");
const AnalyticsSession = require("../models/AnalyticsSession");
const AnalyticsVisitor = require("../models/AnalyticsVisitor");

const allowedEventTypes = [
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
];

const allowedDeviceTypes = [
  "desktop",
  "mobile",
  "tablet",
  "unknown",
];

function cleanText(value, maxLength = 500) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function safeNumber(value, fallback = 0) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return parsedValue;
}

function getSafeDeviceType(deviceType) {
  return allowedDeviceTypes.includes(deviceType)
    ? deviceType
    : "unknown";
}

async function updateAnalyticsSession(eventData) {
  const {
    guestId,
    sessionId,
    eventType,
    pagePath,
    durationSeconds,
    source,
    medium,
    campaign,
    referrerUrl,
    referrerDomain,
    landingPage,
    deviceType,
    browser,
    operatingSystem,
    screenResolution,
    language,
    timezone,
    country,
    region,
    city,
  } = eventData;

  const now = new Date();

  const existingSession = await AnalyticsSession.exists({
    sessionId,
  });

  const setFields = {
    lastActivityAt: now,
    exitPage: cleanText(pagePath, 500),

    browser: cleanText(browser, 100) || "Unknown",

    operatingSystem:
      cleanText(operatingSystem, 100) || "Unknown",

    screenResolution: cleanText(
      screenResolution,
      50
    ),

    language: cleanText(language, 50),
    timezone: cleanText(timezone, 100),

    country: cleanText(country, 100),
    region: cleanText(region, 100),
    city: cleanText(city, 100),

    isActive: eventType !== "session_end",
  };

  if (eventType === "session_end") {
    setFields.endedAt = now;
  }

  const setOnInsertFields = {
    sessionId: cleanText(sessionId, 100),
    guestId: cleanText(guestId, 100),

    startedAt: now,

    landingPage:
      cleanText(landingPage, 500) ||
      cleanText(pagePath, 500),

    source: cleanText(source, 100) || "direct",
    medium: cleanText(medium, 100) || "none",
    campaign: cleanText(campaign, 200),

    referrerUrl: cleanText(
      referrerUrl,
      1000
    ),

    referrerDomain: cleanText(
      referrerDomain,
      250
    ),

    deviceType: getSafeDeviceType(deviceType),
  };

  const incrementFields = {};

  if (eventType === "page_view") {
    incrementFields.pageViews = 1;
  }

  if (eventType === "course_view") {
    incrementFields.courseViews = 1;
  }

  if (eventType === "course_launch") {
    incrementFields.courseLaunches = 1;
  }

  if (eventType === "page_time") {
    incrementFields.activeDurationSeconds =
      Math.max(0, safeNumber(durationSeconds));
  }

  const update = {
    $set: setFields,
    $setOnInsert: setOnInsertFields,
  };

  if (Object.keys(incrementFields).length > 0) {
    update.$inc = incrementFields;
  }

  await AnalyticsSession.findOneAndUpdate(
    {
      sessionId: cleanText(sessionId, 100),
    },
    update,
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    }
  );

  return {
    isNewSession: !existingSession,
  };
}

async function updateAnalyticsVisitor(
  eventData,
  isNewSession
) {
  const {
    guestId,
    eventType,
    pagePath,
    durationSeconds,
    source,
    medium,
    campaign,
    landingPage,
    deviceType,
    browser,
    operatingSystem,
    screenResolution,
    language,
    timezone,
    country,
    region,
    city,
  } = eventData;

  const now = new Date();

  const setFields = {
    lastSeenAt: now,

    latestSource:
      cleanText(source, 100) || "direct",

    latestMedium:
      cleanText(medium, 100) || "none",

    latestCampaign:
      cleanText(campaign, 200),

    latestLandingPage:
      cleanText(landingPage, 500) ||
      cleanText(pagePath, 500),

    latestPagePath:
      cleanText(pagePath, 500),

    deviceType:
      getSafeDeviceType(deviceType),

    browser:
      cleanText(browser, 100) || "Unknown",

    operatingSystem:
      cleanText(operatingSystem, 100) ||
      "Unknown",

    screenResolution:
      cleanText(screenResolution, 50),

    language: cleanText(language, 50),
    timezone: cleanText(timezone, 100),

    country: cleanText(country, 100),
    region: cleanText(region, 100),
    city: cleanText(city, 100),
  };

  const setOnInsertFields = {
    guestId: cleanText(guestId, 100),

    firstSeenAt: now,

    firstSource:
      cleanText(source, 100) || "direct",

    firstMedium:
      cleanText(medium, 100) || "none",

    firstCampaign:
      cleanText(campaign, 200),

    firstLandingPage:
      cleanText(landingPage, 500) ||
      cleanText(pagePath, 500),

    isReturningVisitor: false,
  };

  const incrementFields = {};

  if (isNewSession) {
    incrementFields.totalSessions = 1;
  }

  if (eventType === "page_view") {
    incrementFields.totalPageViews = 1;
  }

  if (eventType === "course_view") {
    incrementFields.totalCourseViews = 1;
  }

  if (eventType === "course_launch") {
    incrementFields.totalCourseLaunches = 1;
  }

  if (eventType === "page_time") {
    incrementFields.totalActiveDurationSeconds =
      Math.max(0, safeNumber(durationSeconds));
  }

  const update = {
    $set: setFields,
    $setOnInsert: setOnInsertFields,
  };

  if (Object.keys(incrementFields).length > 0) {
    update.$inc = incrementFields;
  }

  const visitor =
    await AnalyticsVisitor.findOneAndUpdate(
      {
        guestId: cleanText(guestId, 100),
      },
      update,
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );

  const shouldBeReturning =
    visitor.totalSessions > 1;

  if (
    visitor.isReturningVisitor !==
    shouldBeReturning
  ) {
    visitor.isReturningVisitor =
      shouldBeReturning;

    await visitor.save();
  }

  return visitor;
}

async function createAnalyticsEvent(req, res) {
  try {
    if (
      !req.body ||
      typeof req.body !== "object"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Request body is missing. Send JSON with Content-Type application/json.",
      });
    }

    const {
      guestId,
      sessionId,
      eventType,
      pagePath,
      pageTitle,
      courseId,
      durationSeconds,
      progressPercentage,
      source,
      medium,
      campaign,
      content,
      term,
      referrerUrl,
      referrerDomain,
      landingPage,
      deviceType,
      browser,
      operatingSystem,
      screenResolution,
      language,
      timezone,
      country,
      region,
      city,
      metadata,
    } = req.body;

    if (
      !guestId ||
      !sessionId ||
      !eventType
    ) {
      return res.status(400).json({
        success: false,
        message:
          "guestId, sessionId and eventType are required",
      });
    }

    if (
      !allowedEventTypes.includes(eventType)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid analytics event type",
      });
    }

    let validCourseId = null;

    if (courseId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          courseId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid courseId",
        });
      }

      validCourseId = courseId;
    }

    const safeDuration = Math.max(
      0,
      safeNumber(durationSeconds)
    );

    const safeProgress = Math.min(
      100,
      Math.max(
        0,
        safeNumber(progressPercentage)
      )
    );

    const safeMetadata =
      metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata)
        ? metadata
        : {};

    const eventData = {
      guestId: cleanText(guestId, 100),
      sessionId: cleanText(sessionId, 100),
      eventType,

      pagePath: cleanText(pagePath, 500),
      pageTitle: cleanText(pageTitle, 250),
      courseId: validCourseId,

      durationSeconds: safeDuration,
      progressPercentage: safeProgress,

      source:
        cleanText(source, 100) || "direct",

      medium:
        cleanText(medium, 100) || "none",

      campaign: cleanText(campaign, 200),
      content: cleanText(content, 200),
      term: cleanText(term, 200),

      referrerUrl: cleanText(
        referrerUrl,
        1000
      ),

      referrerDomain: cleanText(
        referrerDomain,
        250
      ),

      landingPage: cleanText(
        landingPage,
        500
      ),

      deviceType:
        getSafeDeviceType(deviceType),

      browser:
        cleanText(browser, 100) ||
        "Unknown",

      operatingSystem:
        cleanText(operatingSystem, 100) ||
        "Unknown",

      screenResolution: cleanText(
        screenResolution,
        50
      ),

      language: cleanText(language, 50),
      timezone: cleanText(timezone, 100),

      country: cleanText(country, 100),
      region: cleanText(region, 100),
      city: cleanText(city, 100),

      metadata: safeMetadata,
    };

    const event =
      await AnalyticsEvent.create(eventData);

    const { isNewSession } =
      await updateAnalyticsSession(eventData);

    await updateAnalyticsVisitor(
      eventData,
      isNewSession
    );

    return res.status(201).json({
      success: true,
      message:
        "Analytics event recorded",
      eventId: event._id,
    });
  } catch (error) {
    console.error(
      "Create analytics event error:",
      error
    );

    if (
      error.name === "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Analytics validation failed",
        error: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Duplicate analytics record",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to record analytics event",
    });
  }
}


module.exports = {
  createAnalyticsEvent,
  
};
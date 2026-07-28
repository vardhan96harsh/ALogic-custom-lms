const Course = require("../models/Course");
const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");

const safeParseJSON = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return [];
  }
};

exports.uploadCourse = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    const {
      title,
      description,
      whatYouWillLearn,
      skills,
      outcomes,
      targetAudience,
      curriculum
    } = req.body || {};

    const thumbnailFile = req.files?.thumbnail?.[0];
    const scormFile = req.files?.scormFile?.[0];

    if (!title || !description || !scormFile) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and SCORM file are required",
      });
    }

    const courseFolderName =
      Date.now() + "-" + title.replace(/\s+/g, "-");

    const courseExtractPath = path.join(
      "uploads",
      "courses",
      courseFolderName
    );

    fs.mkdirSync(courseExtractPath, { recursive: true });

    await fs
      .createReadStream(scormFile.path)
      .pipe(
        unzipper.Extract({
          path: courseExtractPath,
        })
      )
      .promise();

    const launchUrl =
      `/uploads/courses/${courseFolderName}/story.html`;

    const course = await Course.create({
      title,
      description,

      thumbnail: thumbnailFile
        ? thumbnailFile.path.replace(/\\/g, "/")
        : "",

      scormFile: scormFile.path.replace(/\\/g, "/"),

      scormPath: courseExtractPath.replace(/\\/g, "/"),

      launchUrl,

      whatYouWillLearn:
        whatYouWillLearn
          ? safeParseJSON(whatYouWillLearn)
          : [],

      skills:
        skills
          ? safeParseJSON(skills)
          : [],

      outcomes:
        outcomes
          ? safeParseJSON(outcomes)
          : [],

      targetAudience:
        targetAudience
          ? safeParseJSON(targetAudience)
          : [],

      curriculum:
        curriculum
          ? safeParseJSON(curriculum)
          : [],
    });

    return res.status(201).json({
      success: true,
      message: "Course uploaded successfully",
      course,
    });

  } catch (error) {

    console.error("UPLOAD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Course upload failed",
      error: error.message,
    });
  }
};


exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
      error: error.message,
    });
  }
};

exports.getSingleCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    course.views += 1;
    await course.save();

    res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch course",
      error: error.message,
    });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments();
    const courses = await Course.find();

    const totalCourseViews = courses.reduce((sum, course) => {
      return sum + course.views;
    }, 0);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: 1,
        totalCourses,
        totalCourseViews,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message,
    });
  }
};


exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // Update basic info
    const { title, description, whatYouWillLearn, skills, outcomes, targetAudience, curriculum } = req.body;

    if (title) course.title = title;
    if (description) course.description = description;
 // Add this at the top of updateCourse function
const safeParseJSON = (val) => {
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
};

// Then replace parsing lines with:
if (whatYouWillLearn) course.whatYouWillLearn = safeParseJSON(whatYouWillLearn);
if (skills) course.skills = safeParseJSON(skills);
if (outcomes) course.outcomes = safeParseJSON(outcomes);
if (targetAudience) course.targetAudience = safeParseJSON(targetAudience);
if (curriculum) course.curriculum = safeParseJSON(curriculum);

    // Update files if uploaded
    const thumbnailFile = req.files?.thumbnail?.[0];
    const scormFile = req.files?.scormFile?.[0];

    if (thumbnailFile) {
      if (course.thumbnail && fs.existsSync(course.thumbnail)) fs.unlinkSync(course.thumbnail);
      course.thumbnail = thumbnailFile.path.replace(/\\/g, "/");
    }

    if (scormFile) {
      if (course.scormFile && fs.existsSync(course.scormFile)) fs.unlinkSync(course.scormFile);
      if (course.scormPath && fs.existsSync(course.scormPath)) {
        fs.rmSync(course.scormPath, { recursive: true, force: true });
      }

      // Extract new SCORM
      const courseFolderName = Date.now() + "-" + (title || course.title).replace(/\s+/g, "-");
      const courseExtractPath = path.join("uploads", "courses", courseFolderName);
      fs.mkdirSync(courseExtractPath, { recursive: true });

      await fs.createReadStream(scormFile.path).pipe(unzipper.Extract({ path: courseExtractPath })).promise();

      course.scormFile = scormFile.path.replace(/\\/g, "/");
      course.scormPath = courseExtractPath.replace(/\\/g, "/");
      course.launchUrl = `/uploads/courses/${courseFolderName}/story.html`;
    }

    await course.save();

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update course",
      error: error.message,
    });
  }
};


exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Delete thumbnail file
    if (course.thumbnail && fs.existsSync(course.thumbnail)) {
      fs.unlinkSync(course.thumbnail);
    }

    // Delete original SCORM zip file
    if (course.scormFile && fs.existsSync(course.scormFile)) {
      fs.unlinkSync(course.scormFile);
    }

    // Delete extracted SCORM folder
    if (course.scormPath && fs.existsSync(course.scormPath)) {
      fs.rmSync(course.scormPath, { recursive: true, force: true });
    }

    await Course.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete course",
      error: error.message,
    });
  }
};
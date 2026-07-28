const express = require("express");
const router = express.Router();
const multer = require("multer");

const authMiddleware = require("../middleware/authMiddleware");


const {
  uploadCourse,
  getCourses,
  getSingleCourse,
  getDashboardStats,
  deleteCourse,
  updateCourse,
} = require("../controllers/courseController");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.get("/", getCourses);
router.get("/stats/dashboard", authMiddleware, getDashboardStats);
router.get("/:id", getSingleCourse);
router.delete("/:id", authMiddleware, deleteCourse);

router.post(
  "/upload",
  authMiddleware,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "scormFile", maxCount: 1 },
  ]),
  uploadCourse
);

router.post(
  "/update/:id",
  authMiddleware,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "scormFile", maxCount: 1 },
  ]),
  updateCourse
);

module.exports = router;
const express = require("express");

const router = express.Router();

const {
  getCourseProgress,
} = require("../controllers/progressController");


router.get(
  "/:courseId/:guestId",
  getCourseProgress
);


module.exports = router;
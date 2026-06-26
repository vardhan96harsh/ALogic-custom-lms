const express = require("express");
const router = express.Router();

// Import controllers
const { sendDemoRequest, getDemoRequests } = require("../controllers/mailController");

// Import auth middleware
const authMiddleware = require("../middleware/authMiddleware");

// Public API for sending demo requests
router.post("/demo-request", sendDemoRequest);

// Admin-only API for viewing all demo requests
router.get("/requests", authMiddleware, getDemoRequests);

module.exports = router;
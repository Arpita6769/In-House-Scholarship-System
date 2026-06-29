const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController.js");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

// ── Auth ──────────────────────────────────────
router.post("/register", authController.register);
router.post("/login", authController.login);

// ── Scholarships ──────────────────────────────
router.post("/create-scholarship", verifyToken, authController.createScholarship);
router.get("/scholarships", verifyToken, authController.getScholarships);

// Detail page — includes required documents + seats left
router.get("/scholarships/:id", verifyToken, authController.getScholarshipDetail);

// ── Applications ──────────────────────────────

// Student applies — upload.any() accepts any field names as files
// so the frontend can send fields named after each required doc
router.post(
  "/apply/:scholarshipId",
  verifyToken,
  upload.any(),
  authController.applyScholarship
);

router.get("/my-applications", verifyToken, authController.getMyApplications);

// Admin routes
router.get("/applications", verifyToken, authController.getAllApplications);
router.post("/approve/:applicationId", verifyToken, authController.approveApplication);
router.post("/reject/:applicationId", verifyToken, authController.rejectApplication);

// ── Admin-only test ───────────────────────────
router.get("/admin-only", verifyToken, authorizeRole("admin"), (req, res) => {
  res.json({ message: "Welcome Admin" });
});

module.exports = router;
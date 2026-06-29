require("dotenv").config();

const express = require("express");
const path = require("path");
const db = require("./db");
const authRoutes = require("./routes/authRoutes");
const { verifyToken } = require("./middleware/authMiddleware");

const app = express();
const PORT = 3000;

// ── Static files ──────────────────────────────
app.use(express.static("public"));

// Serve uploaded documents so the admin can open them in the browser
// e.g. http://localhost:3000/uploads/1720123456_marksheet.pdf
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Body parsing ──────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────
app.use("/api/auth", authRoutes);

// ── Misc ──────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Scholarship Management System Running");
});

app.get("/test-db", (req, res) => {
  db.query("SELECT 1", (err) => {
    if (err) return res.status(500).send("Database error");
    res.send("Database connected successfully");
  });
});

app.get("/check", (req, res) => res.send("Check route working"));

app.get("/protected", verifyToken, (req, res) => {
  res.json({ message: "Protected route accessed", user: req.user });
});

// ── Multer error handler ──────────────────────
// Must be AFTER routes so multer errors are caught here
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File too large. Max 5MB allowed." });
  }
  if (err.message === "Only PDF, JPG, and PNG files are allowed") {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

// ── Start ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
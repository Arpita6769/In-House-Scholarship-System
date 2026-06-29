const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    // e.g.  1720123456789_marksheet.pdf
    const safeName = Date.now() + "_" + file.originalname.replace(/\s+/g, "_");
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".pdf", ".jpg", ".jpeg", ".png"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, JPG, and PNG files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max per file
});

module.exports = upload;
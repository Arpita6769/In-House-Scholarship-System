console.log("Auth Controller Loaded");

const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ─────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────

exports.register = async (req, res) => {
  const { name, email, password, roll_no, cgpa, family_income } = req.body;
  const role = "student";

  if (!name || !email || !password || !roll_no || !cgpa || !family_income) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users 
      (name, email, password, role, roll_no, cgpa, family_income)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      query,
      [name, email, hashedPassword, role, roll_no, cgpa, family_income],
      (err) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ message: "User already exists or DB error" });
        }
        res.status(201).json({ message: "User registered successfully" });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.promise().query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "Login successful", token, role: user.role });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────
//  SCHOLARSHIPS
// ─────────────────────────────────────────────

exports.createScholarship = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const { title, description, amount, min_cgpa, max_income, total_seats, deadline, documents } = req.body;
  // documents is an optional array: [{ doc_name, doc_hint, is_required }, ...]

  try {
    // 1. Insert scholarship
    const [result] = await db.promise().query(
      `INSERT INTO scholarships
       (title, description, amount, min_cgpa, max_income, total_seats, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description, amount, min_cgpa, max_income, total_seats, deadline]
    );

    const scholarshipId = result.insertId;

    // 2. Insert required documents if provided
    if (documents && documents.length > 0) {
      const docValues = documents.map((d) => [
        scholarshipId,
        d.doc_name,
        d.doc_hint || null,
        d.is_required !== false, // default true
      ]);

      await db.promise().query(
        `INSERT INTO scholarship_documents (scholarship_id, doc_name, doc_hint, is_required)
         VALUES ?`,
        [docValues]
      );
    }

    res.status(201).json({ message: "Scholarship created successfully", id: scholarshipId });

  } catch (err) {
    console.log("CREATE SCHOLARSHIP ERROR:", err);
    res.status(500).json({ message: "Database error" });
  }
};

exports.getScholarships = (req, res) => {
  db.query("SELECT * FROM scholarships", (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(results);
  });
};

// GET /api/auth/scholarships/:id  — full detail including required docs
exports.getScholarshipDetail = async (req, res) => {
  const scholarshipId = req.params.id;

  try {
    // Scholarship info
    const [schRows] = await db.promise().query(
      "SELECT * FROM scholarships WHERE id = ?",
      [scholarshipId]
    );

    if (schRows.length === 0) {
      return res.status(404).json({ message: "Scholarship not found" });
    }

    // Required documents for this scholarship
    const [docRows] = await db.promise().query(
      "SELECT * FROM scholarship_documents WHERE scholarship_id = ?",
      [scholarshipId]
    );

    // Approved seats count
    const [seatRows] = await db.promise().query(
      `SELECT COUNT(*) AS approved_seats FROM applications
       WHERE scholarship_id = ? AND status = 'Approved'`,
      [scholarshipId]
    );

    const scholarship = schRows[0];
    scholarship.required_documents = docRows;
    scholarship.approved_seats = seatRows[0].approved_seats;
    scholarship.seats_left = scholarship.total_seats - scholarship.approved_seats;

    res.json(scholarship);

  } catch (err) {
    console.log("GET SCHOLARSHIP DETAIL ERROR:", err);
    res.status(500).json({ message: "Database error" });
  }
};

// ─────────────────────────────────────────────
//  APPLICATIONS
// ─────────────────────────────────────────────

// POST /api/auth/apply/:scholarshipId
// Accepts: multipart/form-data with optional files + statement field
exports.applyScholarship = async (req, res) => {
  const userId = req.user.id;
  const scholarshipId = req.params.scholarshipId;
  const statement = req.body.statement || null;

  // req.files is an array from multer: [{ fieldname, filename, path, ... }]
  const uploadedFiles = req.files || [];

  try {
    // 1. Get student
    const [userRows] = await db.promise().query(
      "SELECT * FROM users WHERE id = ?",
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = userRows[0];

    // 2. Get scholarship
    const [schRows] = await db.promise().query(
      "SELECT * FROM scholarships WHERE id = ?",
      [scholarshipId]
    );
    if (schRows.length === 0) {
      return res.status(404).json({ message: "Scholarship not found" });
    }
    const scholarship = schRows[0];

    // 3. Eligibility check
    if (scholarship.min_cgpa && user.cgpa < scholarship.min_cgpa) {
      return res.status(400).json({ message: "Not eligible: CGPA too low" });
    }
    if (scholarship.max_income && user.family_income > scholarship.max_income) {
      return res.status(400).json({ message: "Not eligible: Family income too high" });
    }

    // 4. Seats check
    const [seatRows] = await db.promise().query(
      `SELECT COUNT(*) AS approved FROM applications
       WHERE scholarship_id = ? AND status = 'Approved'`,
      [scholarshipId]
    );
    if (seatRows[0].approved >= scholarship.total_seats) {
      return res.status(400).json({ message: "No seats available" });
    }

    // 5. Insert application
    const [appResult] = await db.promise().query(
      "INSERT INTO applications (user_id, scholarship_id, statement) VALUES (?, ?, ?)",
      [userId, scholarshipId, statement]
    );
    const applicationId = appResult.insertId;

    // 6. Save uploaded documents
    if (uploadedFiles.length > 0) {
      const docValues = uploadedFiles.map((file) => [
        applicationId,
        file.fieldname,           // doc_name comes from the field name in the form
        "uploads/" + file.filename,
      ]);

      await db.promise().query(
        `INSERT INTO application_documents (application_id, doc_name, file_path)
         VALUES ?`,
        [docValues]
      );
    }

    res.status(201).json({ message: "Application submitted successfully" });

  } catch (err) {
    console.log("APPLY ERROR:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "You already applied for this scholarship" });
    }

    res.status(500).json({ message: "Database error" });
  }
};

exports.getMyApplications = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.promise().query(
      `SELECT 
         applications.id,
         scholarships.title,
         applications.status,
         applications.applied_at,
         applications.statement
       FROM applications
       JOIN scholarships ON applications.scholarship_id = scholarships.id
       WHERE applications.user_id = ?`,
      [userId]
    );

    res.json(rows);

  } catch (err) {
    console.log("MY APPLICATIONS ERROR:", err);
    res.status(500).json({ message: "Database error" });
  }
};

exports.getAllApplications = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    // Fetch applications with uploaded documents
    const [rows] = await db.promise().query(
      `SELECT 
         applications.id,
         users.name AS student_name,
         users.email,
         users.cgpa,
         users.family_income,
         scholarships.title,
         applications.status,
         applications.statement,
         applications.applied_at
       FROM applications
       JOIN users ON applications.user_id = users.id
       JOIN scholarships ON applications.scholarship_id = scholarships.id`
    );

    // Attach documents to each application
    const [docs] = await db.promise().query(
      "SELECT * FROM application_documents"
    );

    const result = rows.map((app) => ({
      ...app,
      documents: docs.filter((d) => d.application_id === app.id),
    }));

    res.json(result);

  } catch (err) {
    console.log("FETCH APPLICATIONS ERROR:", err);
    res.status(500).json({ message: "Database error" });
  }
};

exports.approveApplication = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const applicationId = req.params.applicationId;

  try {
    const [appRows] = await db.promise().query(
      "SELECT * FROM applications WHERE id = ?",
      [applicationId]
    );
    if (appRows.length === 0) {
      return res.status(404).json({ message: "Application not found" });
    }

    const application = appRows[0];

    if (application.status === "Approved") {
      return res.status(400).json({ message: "Already approved" });
    }

    // Seats check
    const [schRows] = await db.promise().query(
      "SELECT * FROM scholarships WHERE id = ?",
      [application.scholarship_id]
    );
    const scholarship = schRows[0];

    const [countRows] = await db.promise().query(
      `SELECT COUNT(*) AS total FROM applications
       WHERE scholarship_id = ? AND status = 'Approved'`,
      [application.scholarship_id]
    );

    if (countRows[0].total >= scholarship.total_seats) {
      return res.status(400).json({ message: "No seats available" });
    }

    await db.promise().query(
      "UPDATE applications SET status = 'Approved' WHERE id = ?",
      [applicationId]
    );

    res.json({ message: "Application approved" });

  } catch (err) {
    console.log("APPROVAL ERROR:", err);
    res.status(500).json({ message: "Database error" });
  }
};

exports.rejectApplication = async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }

  const applicationId = req.params.applicationId;

  try {
    await db.promise().query(
      "UPDATE applications SET status = 'Rejected' WHERE id = ?",
      [applicationId]
    );
    res.json({ message: "Application rejected" });

  } catch (err) {
    console.log("REJECT ERROR:", err);
    res.status(500).json({ message: "Database error" });
  }
};
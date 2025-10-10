// ----------------------
// server.js
// ----------------------
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const app = express();

// ----------------------
// Middleware
// ----------------------
app.use(cors());
app.use(express.json());
app.use(express.static("frontend")); // serve frontend files

const PORT = process.env.PORT || 3000;

// ----------------------
// Persistent storage files
// ----------------------
const DATA_DIR = "data";
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR); // create if missing

const USERS_FILE = `${DATA_DIR}/users.json`;
const FACULTY_FILE = `${DATA_DIR}/faculty.json`;
const ATTENDANCE_FILE = `${DATA_DIR}/attendance.json`;
const EXAMS_FILE = `${DATA_DIR}/exams.json`;
const NOTICES_FILE = `${DATA_DIR}/notices.json`;
const RESPONSES_FILE = `${DATA_DIR}/responses.json`;
const TIMETABLE_FILE = `${DATA_DIR}/timetable.json`;
const NOTES_FILE = `${DATA_DIR}/notes.json`;
const ASSIGNMENTS_FILE = `${DATA_DIR}/assignments.json`;
const BADGES_FILE = `${DATA_DIR}/badges.json`;
const LOGS_FILE = `${DATA_DIR}/logs.json`;
const TOKENS_FILE = `${DATA_DIR}/tokens.json`;
const FEEDBACK_FILE = `${DATA_DIR}/feedback.json`;

// ----------------------
// Helper: load/save JSON
// ----------------------
function loadData(file, defaultData) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
    }
    return JSON.parse(fs.readFileSync(file));
  } catch {
    return defaultData;
  }
}

function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ----------------------
// Load all data
// ----------------------
let facultyAccounts = loadData(FACULTY_FILE, []);
let attendance = loadData(ATTENDANCE_FILE, []);
let exams = loadData(EXAMS_FILE, []);
let notices = loadData(NOTICES_FILE, []);
let customResponses = loadData(RESPONSES_FILE, []);
let timetable = loadData(TIMETABLE_FILE, []);
let notes = loadData(NOTES_FILE, []);
let assignments = loadData(ASSIGNMENTS_FILE, []);
let badges = loadData(BADGES_FILE, []);
let logs = loadData(LOGS_FILE, []);
let tokens = loadData(TOKENS_FILE, {});
let feedbacks = loadData(FEEDBACK_FILE, []);

// ----------------------
// Utilities
// ----------------------
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

function logAction(action, user) {
  logs.push({ action, user, timestamp: new Date().toISOString() });
  saveData(LOGS_FILE, logs);
}

function generateToken() {
  return crypto.randomBytes(20).toString("hex");
}

// ----------------------
// Nodemailer setup (for password reset)
// ----------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ----------------------
// Admin Authentication Middleware (fixed)
// ----------------------
async function authenticateAdmin(req, res, next) {
  const { username, password } = req.body; // username = email
  let user;

  try {
    // Reload users.json fresh on every login
    const usersData = JSON.parse(fs.readFileSync(USERS_FILE));
    user = usersData[username];
  } catch (err) {
    console.error("❌ Failed to read users.json:", err);
    return res.status(500).json({ msg: "❌ Server error" });
  }

  console.log("🔍 Checking admin login for:", username);
  if (!user) {
    console.log("❌ No user found");
    return res.status(401).json({ msg: "❌ Invalid admin credentials" });
  }

  // Make sure password field exists
  if (!user.password) {
    console.log("❌ Password missing in user record");
    return res.status(401).json({ msg: "❌ Invalid admin credentials" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    console.log("❌ Password mismatch");
    return res.status(401).json({ msg: "❌ Invalid admin credentials" });
  }

  req.user = { email: username, role: user.role };
  next();
}

// ----------------------
// Admin Login
// ----------------------
app.post("/admin/login", authenticateAdmin, (req, res) => {
  logAction("Admin login", req.user.email);
  res.json({ msg: "✅ Login successful", user: req.user });
});

// ----------------------
// Forgot Password
// ----------------------
app.post("/admin/forgot-password", (req, res) => {
  const { username } = req.body;
  const usersData = loadData(USERS_FILE, {});
  const user = usersData[username];

  if (!user) return res.status(404).json({ msg: "❌ User not found" });

  const token = generateToken();
  tokens[username] = { token, expires: Date.now() + 3600000 }; // 1 hour expiry
  saveData(TOKENS_FILE, tokens);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: username,
    subject: "Password Reset Token",
    text: `Your password reset token is: ${token}`,
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) return res.status(500).json({ msg: "❌ Failed to send email" });
    res.json({ msg: "✅ Password reset token sent to email" });
  });
});

// ----------------------
// Reset Password
// ----------------------
app.post("/admin/reset-password", async (req, res) => {
  const { username, token, newPassword } = req.body;
  const record = tokens[username];

  if (!record || record.token !== token || record.expires < Date.now())
    return res.status(400).json({ msg: "❌ Invalid or expired token" });

  const usersData = loadData(USERS_FILE, {});
  usersData[username].password = await bcrypt.hash(newPassword, 10);
  saveData(USERS_FILE, usersData);

  delete tokens[username];
  saveData(TOKENS_FILE, tokens);

  logAction("Password reset", username);
  res.json({ msg: "✅ Password reset successful" });
});

// ----------------------
// Test Route
// ----------------------
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// ----------------------
// Start Server
// ----------------------
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

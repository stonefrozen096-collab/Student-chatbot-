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
app.use(express.static("frontend")); // serve frontend

const PORT = process.env.PORT || 3000;

// ----------------------
// Persistent storage files
// ----------------------
const USERS_FILE = "data/users.json";
const FACULTY_FILE = "data/faculty.json";
const ATTENDANCE_FILE = "data/attendance.json";
const EXAMS_FILE = "data/exams.json";
const NOTICES_FILE = "data/notices.json";
const RESPONSES_FILE = "data/responses.json";
const TIMETABLE_FILE = "data/timetable.json";
const NOTES_FILE = "data/notes.json";
const ASSIGNMENTS_FILE = "data/assignments.json";
const BADGES_FILE = "data/badges.json";
const LOGS_FILE = "data/logs.json";
const TOKENS_FILE = "data/tokens.json";
const FEEDBACK_FILE = "data/feedback.json";

// ----------------------
// Helper: load/save JSON
// ----------------------
function loadData(file, defaultData) {
  try { return JSON.parse(fs.readFileSync(file)); } 
  catch { return defaultData; }
}
function saveData(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

// ----------------------
// Load data
// ----------------------
let users = loadData(USERS_FILE, {});           // <--- FIXED: use empty object, not array
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
let tokens = loadData(TOKENS_FILE, []);
let feedbacks = loadData(FEEDBACK_FILE, []);

// ----------------------
// Utilities
// ----------------------
async function hashPassword(password) { return await bcrypt.hash(password, 10); }
async function comparePassword(password, hash) { return await bcrypt.compare(password, hash); }

function logAction(action, user) {
  logs.push({ action, user, timestamp: new Date().toISOString() });
  saveData(LOGS_FILE, logs);
}

function generateToken() {
  return crypto.randomBytes(20).toString("hex");
}

// ----------------------
// Nodemailer setup
// ----------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ----------------------
// Admin authentication
// ----------------------
async function authenticateAdmin(req, res, next){
  const { username, password } = req.body; // username is email
  const user = users[username];
  if(!user) return res.status(401).json({ msg:"❌ Invalid admin credentials" });

  const match = await bcrypt.compare(password, user.password);
  if(!match) return res.status(401).json({ msg:"❌ Invalid admin credentials" });

  req.user = { email: username, role: user.role };
  next();
}

// ----------------------
// Admin login
// ----------------------
app.post("/admin/login", authenticateAdmin, (req, res) => {
  res.json({ msg: "✅ Login successful", user: req.user });
});

// ----------------------
// Forgot password
// ----------------------
app.post("/admin/forgot-password", (req, res) => {
  const { username } = req.body;
  const user = users[username];
  if(!user) return res.status(404).json({ msg:"❌ User not found" });

  const token = crypto.randomBytes(20).toString("hex");
  tokens[username] = { token, expires: Date.now() + 3600000 }; // 1 hour expiry
  saveData(TOKENS_FILE, tokens);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: username,
    subject: "Password Reset Token",
    text: `Your password reset token is: ${token}`
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if(err) return res.status(500).json({ msg:"❌ Failed to send email", error: err });
    res.json({ msg:"✅ Password reset token sent to email" });
  });
});

// ----------------------
// Reset password
// ----------------------
app.post("/admin/reset-password", async (req, res) => {
  const { username, token, newPassword } = req.body;
  const record = tokens[username];

  if(!record || record.token !== token || record.expires < Date.now())
    return res.status(400).json({ msg:"❌ Invalid or expired token" });

  users[username].password = await bcrypt.hash(newPassword, 10);
  saveData(USERS_FILE, users);

  delete tokens[username];
  saveData(TOKENS_FILE, tokens);

  res.json({ msg:"✅ Password reset successfully" });
});

// ----------------------
// Test route
// ----------------------
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// ----------------------
// Start server
// ----------------------
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));

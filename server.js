// ----------------------
// server.js (FULL - all features)
// ----------------------
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");
const app = express();

// ----------------------
// Middleware
// ----------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("frontend")); // serve frontend files

const PORT = process.env.PORT || 3000;

// ----------------------
// Data files and ensuring data dir exists
// ----------------------
const DATA_DIR = "data";
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const USERS_FILE = path.join(DATA_DIR, "users.json");          // object keyed by username/email/regno
const FACULTY_FILE = path.join(DATA_DIR, "faculty.json");      // array or object (kept as array)
const ATTENDANCE_FILE = path.join(DATA_DIR, "attendance.json");
const EXAMS_FILE = path.join(DATA_DIR, "exams.json");
const NOTICES_FILE = path.join(DATA_DIR, "notices.json");
const RESPONSES_FILE = path.join(DATA_DIR, "responses.json");
const TIMETABLE_FILE = path.join(DATA_DIR, "timetable.json");
const NOTES_FILE = path.join(DATA_DIR, "notes.json");
const ASSIGNMENTS_FILE = path.join(DATA_DIR, "assignments.json");
const BADGES_FILE = path.join(DATA_DIR, "badges.json");
const LOGS_FILE = path.join(DATA_DIR, "logs.json");
const TOKENS_FILE = path.join(DATA_DIR, "tokens.json");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");
const CHAT_HISTORY_FILE = path.join(DATA_DIR, "chat_history.json");

// ----------------------
// Helpers: load/save JSON
// ----------------------
function loadData(filePath, defaultData) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw) return defaultData;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error loading data:", filePath, err);
    return defaultData;
  }
}

function saveData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error saving data:", filePath, err);
  }
}

// Initialize files if missing
let users = loadData(USERS_FILE, {});           // keyed object: email/regno -> { password, role, name, ... }
let facultyAccounts = loadData(FACULTY_FILE, []); // array of faculty entries (optional duplicate of users)
let attendance = loadData(ATTENDANCE_FILE, []);   
let exams = loadData(EXAMS_FILE, []);             
let notices = loadData(NOTICES_FILE, []);         
let customResponses = loadData(RESPONSES_FILE, []); 
let timetable = loadData(TIMETABLE_FILE, []);      
let notes = loadData(NOTES_FILE, []);             
let assignments = loadData(ASSIGNMENTS_FILE, []); 
let badges = loadData(BADGES_FILE, {});           // keyed by username -> [badge1, badge2]
let logs = loadData(LOGS_FILE, []);               
let tokens = loadData(TOKENS_FILE, {});  
let feedbacks = loadData(FEEDBACK_FILE, []);
let chatHistory = loadData(CHAT_HISTORY_FILE, []);

// ----------------------
// Utilities
// ----------------------
async function hashPassword(password) { return await bcrypt.hash(password, 10); }
async function comparePassword(password, hash) { return await bcrypt.compare(password, hash); }

function logAction(action, user = "system") {
  const entry = { action, user, timestamp: new Date().toISOString() };
  logs.push(entry);
  saveData(LOGS_FILE, logs);
}

// generate a secure token
function generateToken() {
  return crypto.randomBytes(20).toString("hex");
}

// Badge hierarchy order (higher index => lower priority)
const BADGE_PRIORITY = ["admin","moderator","tester","faculty","student"];

// ----------------------
// Nodemailer (for reset tokens)
// ----------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "", // set in environment
    pass: process.env.EMAIL_PASS || ""
  }
});

// safe send mail wrapper (fails gracefully if no creds)
function sendMailSafe(mailOptions, callback) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("EMAIL_USER/PASS not configured — skipping email send.");
    if (callback) callback(new Error("email not configured"));
    return;
  }
  transporter.sendMail(mailOptions, callback);
}

// ----------------------
// Utility: ensure user shape
// ----------------------
async function ensureUserExists(username, defaultObj = {}) {
  users = loadData(USERS_FILE, {});
  if (!users[username]) {
    // if password provided in defaultObj, hash it
    if (defaultObj.password && !defaultObj.password.startsWith("$2b$")) {
      defaultObj.password = await hashPassword(defaultObj.password);
    }
    users[username] = defaultObj;
    saveData(USERS_FILE, users);
  }
  return users[username];
}

// ----------------------
// Authentication middleware examples (simple)
// ----------------------
async function authenticateAdmin(req, res, next) {
  const { username, password } = req.body;
  users = loadData(USERS_FILE, {});
  const user = users[username];
  if (!user || !user.password || user.role !== "admin") return res.status(401).json({ msg: "❌ Invalid admin credentials" });
  const ok = await comparePassword(password, user.password);
  if (!ok) return res.status(401).json({ msg: "❌ Invalid admin credentials" });
  req.user = { username, role: user.role };
  next();
}

async function authenticateFaculty(req, res, next) {
  const { username, password } = req.body;
  users = loadData(USERS_FILE, {});
  const user = users[username];
  if (!user || !user.password || user.role !== "faculty") return res.status(401).json({ msg: "❌ Invalid faculty credentials" });
  const ok = await comparePassword(password, user.password);
  if (!ok) return res.status(401).json({ msg: "❌ Invalid faculty credentials" });
  req.user = { username, role: user.role };
  next();
}

async function authenticateModerator(req, res, next) {
  const { username, password } = req.body;
  users = loadData(USERS_FILE, {});
  const user = users[username];
  if (!user || !user.password || user.role !== "moderator") return res.status(401).json({ msg: "❌ Invalid moderator credentials" });
  const ok = await comparePassword(password, user.password);
  if (!ok) return res.status(401).json({ msg: "❌ Invalid moderator credentials" });
  req.user = { username, role: user.role };
  next();
}

// For student we allow login by regno (no password required by design)
function authenticateStudent(req, res, next) {
  const { regno } = req.body;
  users = loadData(USERS_FILE, {});
  const user = users[regno];
  if (!user || user.role !== "student") return res.status(401).json({ msg: "❌ Invalid student credentials" });
  req.user = { username: regno, role: "student" };
  next();
}

// ----------------------
// ROUTES
// ----------------------

// Basic test route
app.get("/", (req, res) => res.send("Server is running ✅"));

// ----------------------
// ADMIN ROUTES
// ----------------------
app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  users = loadData(USERS_FILE, {});
  const user = users[username];
  if (!user || !user.password || user.role !== "admin") return res.status(401).json({ msg: "❌ Invalid admin credentials" });
  const ok = await comparePassword(password, user.password);
  if (!ok) return res.status(401).json({ msg: "❌ Invalid admin credentials" });

  logAction("Admin login", username);
  return res.json({ msg: "✅ Login successful", user: { username, role: user.role, name: user.name || "" } });
});

// create or update an admin (protected in real app; here open for convenience)
// expects { username, password, name } — will set role to admin
app.post("/admin/create", async (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password) return res.status(400).json({ msg: "username & password required" });
  users = loadData(USERS_FILE, {});
  users[username] = users[username] || {};
  users[username].password = await hashPassword(password);
  users[username].role = "admin";
  users[username].name = name || users[username].name || "Admin";
  saveData(USERS_FILE, users);
  logAction("Admin created/updated", username);
  res.json({ msg: "✅ Admin created/updated" });
});

// forgot password -> send token to email (username should be email)
app.post("/admin/forgot-password", (req, res) => {
  const { username } = req.body;
  users = loadData(USERS_FILE, {});
  const user = users[username];
  if (!user) return res.status(404).json({ msg: "❌ User not found" });

  const token = generateToken();
  tokens = loadData(TOKENS_FILE, {});
  tokens[username] = { token, expires: Date.now() + 3600000 }; // 1h expiry
  saveData(TOKENS_FILE, tokens);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: username,
    subject: "Student Assistant - Password reset token",
    text: `Your password reset token: ${token}`
  };

  sendMailSafe(mailOptions, (err) => {
    if (err) {
      console.error("Failed to send reset email:", err);
      return res.status(500).json({ msg: "❌ Failed to send email (server unconfigured)" });
    }
    logAction("Password reset token sent", username);
    res.json({ msg: "✅ Password reset token sent to email" });
  });
});

// reset password using token
app.post("/admin/reset-password", async (req, res) => {
  const { username, token, newPassword } = req.body;
  tokens = loadData(TOKENS_FILE, {});
  const record = tokens[username];
  if (!record || record.token !== token || record.expires < Date.now()) {
    return res.status(400).json({ msg: "❌ Invalid or expired token" });
  }
  users = loadData(USERS_FILE, {});
  if (!users[username]) return res.status(404).json({ msg: "❌ User not found" });
  users[username].password = await hashPassword(newPassword);
  saveData(USERS_FILE, users);
  delete tokens[username];
  saveData(TOKENS_FILE, tokens);
  logAction("Password reset", username);
  res.json({ msg: "✅ Password reset successful" });
});

// admin profile (view)
app.get("/admin/profile/:username", (req, res) => {
  const username = req.params.username;
  users = loadData(USERS_FILE, {});
  const user = users[username];
  if (!user || user.role !== "admin") return res.status(404).json({ msg: "❌ Admin not found" });
  res.json({ username, name: user.name || "", role: user.role, badges: badges[username] || [] });
});

// Admin: add user (student/faculty/moderator/tester)
app.post("/admin/add-user", async (req, res) => {
  const { username, password, role, name, regno } = req.body;
  if (!username || !role) return res.status(400).json({ msg: "username and role required" });
  users = loadData(USERS_FILE, {});
  if (users[username]) return res.status(400).json({ msg: "User already exists" });
  users[username] = { name: name || "", role };
  if (role === "student") {
    // for students, allow regno alternative key: also store under regno if provided
    const key = regno || username;
    users[key] = users[username];
    users[key].role = "student";
    users[key].name = name || "";
    users = loadData(USERS_FILE, users);
    saveData(USERS_FILE, users);
    logAction("Student added", key);
    return res.json({ msg: "✅ Student added", user: { regno: key } });
  } else {
    if (!password) return res.status(400).json({ msg: "password required for non-student users" });
    users[username].password = await hashPassword(password);
    saveData(USERS_FILE, users);
    logAction(`User added (${role})`, username);
    return res.json({ msg: "✅ User added" });
  }
});

// Admin: remove user
app.post("/admin/remove-user", (req, res) => {
  const { username } = req.body;
  users = loadData(USERS_FILE, {});
  if (!users[username]) return res.status(404).json({ msg: "User not found" });
  delete users[username];
  saveData(USERS_FILE, users);
  logAction("User removed", username);
  res.json({ msg: "✅ User removed" });
});

// Admin: add faculty (alias of add-user)
app.post("/admin/add-faculty", async (req, res) => {
  const { username, password, name, department } = req.body;
  if (!username || !password) return res.status(400).json({ msg: "username & password required" });
  users = loadData(USERS_FILE, {});
  users[username] = { password: await hashPassword(password), role: "faculty", name: name || "", department: department || "" };
  saveData(USERS_FILE, users);
  // also add to facultyAccounts array if you want
  facultyAccounts = loadData(FACULTY_FILE, []);
  if (!facultyAccounts.find(f => f.username === username)) {
    facultyAccounts.push({ username, name: name || "", department: department || "" });
    saveData(FACULTY_FILE, facultyAccounts);
  }
  logAction("Faculty added", username);
  res.json({ msg: "✅ Faculty added" });
});

// Admin: remove faculty
app.post("/admin/remove-faculty", (req, res) => {
  const { username } = req.body;
  users = loadData(USERS_FILE, {});
  if (!users[username]) return res.status(404).json({ msg: "Faculty not found" });
  delete users[username];
  facultyAccounts = loadData(FACULTY_FILE, []).filter(f => f.username !== username);
  saveData(FACULTY_FILE, facultyAccounts);
  saveData(USERS_FILE, users);
  logAction("Faculty removed", username);
  res.json({ msg: "✅ Faculty removed" });
});

// Admin: add notice
app.post("/admin/add-notice", (req, res) => {
  const { notice } = req.body;
  if (!notice) return res.status(400).json({ msg: "notice required" });
  notices = loadData(NOTICES_FILE, []);
  const id = crypto.randomBytes(8).toString("hex");
  notices.push({ id, text: notice, createdAt: new Date().toISOString() });
  saveData(NOTICES_FILE, notices);
  logAction("Notice added", "admin");
  res.json({ msg: "✅ Notice added" });
});

// Admin: add exam
app.post("/admin/add-exam", (req, res) => {
  const { name, date } = req.body;
  if (!name || !date) return res.status(400).json({ msg: "name & date required" });
  exams = loadData(EXAMS_FILE, []);
  const id = crypto.randomBytes(8).toString("hex");
  exams.push({ id, name, date, createdAt: new Date().toISOString() });
  saveData(EXAMS_FILE, exams);
  logAction("Exam added", "admin");
  res.json({ msg: "✅ Exam added" });
});

// Admin: assign badge
app.post("/admin/assign-badge", (req, res) => {
  const { username, badge } = req.body;
  if (!username || !badge) return res.status(400).json({ msg: "username & badge required" });
  users = loadData(USERS_FILE, {});
  if (!users[username]) return res.status(404).json({ msg: "User not found" });
  badges = loadData(BADGES_FILE, {});
  badges[username] = badges[username] || [];
  if (!badges[username].includes(badge)) badges[username].push(badge);
  saveData(BADGES_FILE, badges);
  logAction(`Badge assigned (${badge})`, username);
  res.json({ msg: "✅ Badge assigned" });
});

// Admin: fetch logs
app.get("/admin/logs", (req, res) => {
  logs = loadData(LOGS_FILE, []);
  res.json(logs);
});

// ----------------------
// FACULTY ROUTES
// ----------------------
// Faculty login
app.post("/faculty/login", async (req, res) => {
  const { username, password } = req.body;
  users = loadData(USERS_FILE, {});
  const user = users[username];
  if (!user || !user.password || user.role !== "faculty") return res.status(401).json({ msg: "❌ Invalid faculty credentials" });
  const ok = await comparePassword(password, user.password);
  if (!ok) return res.status(401).json({ msg: "❌ Invalid faculty credentials" });
  logAction("Faculty login", username);
  res.json({ msg: "✅ Login successful", user: { username, name: user.name || "", role: user.role } });
});

// Faculty profile - view (only self or admin can request)
app.get("/faculty/profile/:username", (req, res) => {
  const username = req.params.username;
  users = loadData(USERS_FILE, {});
  const user = users[username];
  if (!user || user.role !== "faculty") return res.status(404).json({ msg: "❌ Faculty not found" });
  // assigned students will be computed on request (see below)
  res.json({ username, name: user.name || "", role: user.role, department: user.department || "", badges: badges[username] || [] });
});

// Add note for student (faculty action)
app.post("/faculty/add-note", (req, res) => {
  const { faculty, regno, note, isPrivate } = req.body;
  if (!faculty || !regno || !note) return res.status(400).json({ msg: "faculty, regno & note required" });
  users = loadData(USERS_FILE, {});
  if (!users[regno] || users[regno].role !== "student") return res.status(404).json({ msg: "Student not found" });
  // optional: check that faculty is assigned to this student before allowing note (enforce visibility rules)
  if (users[regno].assignedFaculty && users[regno].assignedFaculty !== faculty && users[faculty] && users[faculty].role !== "admin") {
    // faculty not assigned and not admin
    return res.status(403).json({ msg: "❌ Not authorized to add note to this student" });
  }
  notes = loadData(NOTES_FILE, []);
  const id = crypto.randomBytes(8).toString("hex");
  notes.push({ id, faculty, regno, note, isPrivate: !!isPrivate, createdAt: new Date().toISOString() });
  saveData(NOTES_FILE, notes);
  logAction("Note added", faculty);
  res.json({ msg: "✅ Note added" });
});

// Faculty: get assigned students
app.get("/faculty/assigned-students", (req, res) => {
  const facultyUsername = req.query.facultyUsername;
  const adminView = req.query.adminView === "true";
  users = loadData(USERS_FILE, {});
  const result = [];
  for (const key in users) {
    const u = users[key];
    if (u.role === "student") {
      if (adminView || u.assignedFaculty === facultyUsername) result.push({ regno: key, name: u.name || "" });
    }
  }
  res.json(result);
});

// ----------------------
// STUDENT ROUTES
// ----------------------
// Student login (by regno)
app.post("/student/login", (req, res) => {
  const { regno } = req.body;
  users = loadData(USERS_FILE, {});
  const user = users[regno];
  if (!user || user.role !== "student") return res.status(401).json({ msg: "❌ Invalid student credentials" });
  logAction("Student login", regno);
  res.json({ msg: "✅ Login successful", user: { regno, name: user.name || "" } });
});

// Get student data (profile)
app.get("/student/data", (req, res) => {
  const regno = req.query.regno;
  users = loadData(USERS_FILE, {});
  const user = users[regno];
  if (!user || user.role !== "student") return res.status(404).json({ msg: "Student not found" });
  // include assigned faculty if any, and notes visible to the student (non-private)
  const assignedFaculty = user.assignedFaculty || null;
  notes = loadData(NOTES_FILE, []);
  const publicNotes = notes.filter(n => n.regno === regno && !n.isPrivate);
  res.json({ regno, name: user.name || "", assignedFaculty, notes: publicNotes, badges: badges[regno] || [] });
});

// Student: submit feedback
app.post("/feedback", (req, res) => {
  const { user, feedback } = req.body;
  if (!user || !feedback) return res.status(400).json({ msg: "user & feedback required" });
  feedbacks = loadData(FEEDBACK_FILE, []);
  feedbacks.push({ id: crypto.randomBytes(8).toString("hex"), user, feedback, createdAt: new Date().toISOString() });
  saveData(FEEDBACK_FILE, feedbacks);
  logAction("Feedback submitted", user);
  res.json({ msg: "✅ Feedback submitted" });
});

// ----------------------
// MODERATOR ROUTES
// ----------------------
// Moderator login
app.post("/moderator/login", async (req, res) => {
  const { username, password } = req.body;
  users = loadData(USERS_FILE, {});
  const user = users[username];
  if (!user || !user.password || user.role !== "moderator") return res.status(401).json({ msg: "❌ Invalid moderator credentials" });
  const ok = await comparePassword(password, user.password);
  if (!ok) return res.status(401).json({ msg: "❌ Invalid moderator credentials" });
  logAction("Moderator login", username);
  res.json({ msg: "✅ Login successful", user: { username, name: user.name || "" } });
});

// Moderator: logs & suspicious activity
app.get("/moderator/logs", (req, res) => {
  logs = loadData(LOGS_FILE, []);
  res.json(logs);
});

app.get("/moderator/suspicious", (req, res) => {
  // simple heuristic: repeated failed logins or many actions — for demo return last 10 logs flagged
  logs = loadData(LOGS_FILE, []);
  // example: suspicious = logs with "failed" or "invalid" in action
  const suspicious = logs.filter(l => /failed|invalid|error|unauthorized/i.test(l.action)).slice(-50);
  res.json(suspicious);
});

// Moderator: message admin (store in chat history)
app.post("/moderator/message", (req, res) => {
  const { message, from } = req.body;
  if (!message) return res.status(400).json({ msg: "message required" });
  chatHistory = loadData(CHAT_HISTORY_FILE, []);
  const id = crypto.randomBytes(8).toString("hex");
  chatHistory.push({ id, sender: from || "moderator", text: message, createdAt: new Date().toISOString() });
  saveData(CHAT_HISTORY_FILE, chatHistory);
  logAction("Moderator message", from || "moderator");
  res.json({ msg: "✅ Message sent to admin" });
});

app.get("/moderator/messages", (req, res) => {
  chatHistory = loadData(CHAT_HISTORY_FILE, []);
  res.json(chatHistory);
});

// ----------------------
// TESTER ROUTES
// ----------------------
// Tester login
app.post("/tester/login", async (req, res) => {
  const { username, password } = req.body;
  users = loadData(USERS_FILE, {});
  const user = users[username];
  if (!user || !user.password || user.role !== "tester") return res.status(401).json({ msg: "❌ Invalid tester credentials" });
  const ok = await comparePassword(password, user.password);
  if (!ok) return res.status(401).json({ msg: "❌ Invalid tester credentials" });
  logAction("Tester login", username);
  res.json({ msg: "✅ Login successful", user: { username, name: user.name || "" } });
});

// Tester: submit test (store as assignment or separate)
app.post("/tester/submit-test", (req, res) => {
  const { tester, testName, results } = req.body;
  if (!tester || !testName) return res.status(400).json({ msg: "tester & testName required" });
  assignments = loadData(ASSIGNMENTS_FILE, []);
  const id = crypto.randomBytes(8).toString("hex");
  assignments.push({ id, tester, testName, results: results || null, createdAt: new Date().toISOString() });
  saveData(ASSIGNMENTS_FILE, assignments);
  logAction("Test submitted", tester);
  res.json({ msg: "✅ Test submitted" });
});

// ----------------------
// CHATBOT (simple stub)
// ----------------------
app.post("/chatbot/query", (req, res) => {
  const { message, from } = req.body;
  if (!message) return res.status(400).json({ msg: "message required" });
  // simple echo bot + store history; in future integrate real AI
  const reply = `I received: ${message}`;
  chatHistory = loadData(CHAT_HISTORY_FILE, []);
  chatHistory.push({ id: crypto.randomBytes(8).toString("hex"), sender: "user", text: message, createdAt: new Date().toISOString() });
  chatHistory.push({ id: crypto.randomBytes(8).toString("hex"), sender: "bot", text: reply, createdAt: new Date().toISOString() });
  saveData(CHAT_HISTORY_FILE, chatHistory);
  res.json({ reply });
});

// ----------------------
// GENERAL UTILITIES: notices, exams, timetable, attendance
// ----------------------
app.get("/api/notices", (req, res) => {
  notices = loadData(NOTICES_FILE, []);
  res.json(notices);
});

app.get("/api/exams", (req, res) => {
  exams = loadData(EXAMS_FILE, []);
  res.json(exams);
});

app.get("/api/timetable", (req, res) => {
  timetable = loadData(TIMETABLE_FILE, []);
  res.json(timetable);
});

// Attendance add/view
app.post("/attendance/mark", (req, res) => {
  const { regno, date, status } = req.body;
  if (!regno || !date || !status) return res.status(400).json({ msg: "regno, date, status required" });
  attendance = loadData(ATTENDANCE_FILE, []);
  attendance.push({ regno, date, status, createdAt: new Date().toISOString() });
  saveData(ATTENDANCE_FILE, attendance);
  logAction("Attendance marked", regno);
  res.json({ msg: "✅ Attendance marked" });
});

app.get("/attendance", (req, res) => {
  attendance = loadData(ATTENDANCE_FILE, []);
  res.json(attendance);
});

// ----------------------
// NOTES, ASSIGNMENTS, RESPONSES
// ----------------------
app.get("/notes", (req, res) => {
  notes = loadData(NOTES_FILE, []);
  res.json(notes);
});

app.get("/assignments", (req, res) => {
  assignments = loadData(ASSIGNMENTS_FILE, []);
  res.json(assignments);
});

app.post("/api/response", (req, res) => {
  const { user, response } = req.body;
  if (!user || !response) return res.status(400).json({ msg: "user & response required" });
  customResponses = loadData(RESPONSES_FILE, []);
  customResponses.push({ id: crypto.randomBytes(8).toString("hex"), user, response, createdAt: new Date().toISOString() });
  saveData(RESPONSES_FILE, customResponses);
  logAction("Custom response saved", user);
  res.json({ msg: "✅ Response saved" });
});

// ----------------------
// BADGES & PROFILE ROUTES (visibility rules)
// ----------------------

// Get badges for a user
app.get("/badges/:username", (req, res) => {
  const username = req.params.username;
  badges = loadData(BADGES_FILE, {});
  res.json(badges[username] || []);
});

// Get profile for any role (returns role-specific data and badges)
// Query param ?viewer=viewerUsername allows role-based visibility (viewer is who is requesting)
app.get("/profile/:username", (req, res) => {
  const target = req.params.username;
  const viewer = req.query.viewer || null; // who is requesting (to apply visibility rules)
  users = loadData(USERS_FILE, {});
  badges = loadData(BADGES_FILE, {});
  if (!users[target]) return res.status(404).json({ msg: "User not found" });

  const targetUser = users[target];
  const role = targetUser.role;

  // base profile
  const profile = { username: target, name: targetUser.name || "", role, badges: badges[target] || [] };

  // role-specific augmentation
  if (role === "student") {
    // assigned faculty is visible only to student and admin and assigned faculty
    profile.assignedFaculty = targetUser.assignedFaculty || null;
    // notes: only non-private notes or notes authored by viewer or admin
    notes = loadData(NOTES_FILE, []);
    profile.notes = notes.filter(n => {
      if (n.regno !== target) return false;
      if (!n.isPrivate) return true;
      if (viewer && viewer === n.faculty) return true; // faculty who wrote can view
      if (viewer && users[viewer] && users[viewer].role === "admin") return true;
      return false;
    });
  } else if (role === "faculty") {
    // faculty sees only assigned students - but for profile we list which students are assigned to this faculty
    users = loadData(USERS_FILE, {});
    const assigned = [];
    for (const key in users) {
      if (users[key].role === "student" && users[key].assignedFaculty === target) assigned.push({ regno: key, name: users[key].name || "" });
    }
    profile.assignedStudents = assigned;
    profile.department = targetUser.department || "";
  } else if (role === "moderator" || role === "tester" || role === "admin") {
    // admins can see everything — we return summary info
    if (role === "admin") {
      // include counts
      const allUsers = loadData(USERS_FILE, {});
      profile.summary = {
        totalUsers: Object.keys(allUsers).length,
        totalStudents: Object.values(allUsers).filter(u => u.role === "student").length,
        totalFaculty: Object.values(allUsers).filter(u => u.role === "faculty").length
      };
    }
  }

  res.json(profile);
});

// ----------------------
// ASSIGNMENTS: assign faculty to student
// ----------------------
app.post("/admin/assign-faculty", (req, res) => {
  const { adminUser, studentRegno, facultyUsername } = req.body;
  // for security you'd verify adminUser is admin; skip for brevity or enforce:
  users = loadData(USERS_FILE, {});
  if (!users[studentRegno] || users[studentRegno].role !== "student") return res.status(404).json({ msg: "Student not found" });
  if (!users[facultyUsername] || users[facultyUsername].role !== "faculty") return res.status(404).json({ msg: "Faculty not found" });
  users[studentRegno].assignedFaculty = facultyUsername;
  saveData(USERS_FILE, users);
  logAction(`Faculty ${facultyUsername} assigned to student ${studentRegno}`, adminUser || "admin");
  res.json({ msg: "✅ Faculty assigned to student" });
});

// ----------------------
// SEARCH & UTILITIES
// ----------------------
app.get("/search/users", (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  users = loadData(USERS_FILE, {});
  const results = [];
  for (const key in users) {
    const u = users[key];
    if ((u.name && u.name.toLowerCase().includes(q)) || key.toLowerCase().includes(q)) results.push({ username: key, name: u.name || "", role: u.role });
  }
  res.json(results);
});

// ----------------------
// SIMPLE MAINTENANCE HELPERS (for convenience)
// ----------------------
// Rebuild data files with empty defaults (use carefully)
app.post("/admin/reset-data", (req, res) => {
  // caution: destructive - only allow if admin in real app; here we keep it but it is open
  saveData(USERS_FILE, users);
  saveData(FACULTY_FILE, facultyAccounts);
  saveData(ATTENDANCE_FILE, attendance);
  saveData(EXAMS_FILE, exams);
  saveData(NOTICES_FILE, notices);
  saveData(RESPONSES_FILE, customResponses);
  saveData(TIMETABLE_FILE, timetable);
  saveData(NOTES_FILE, notes);
  saveData(ASSIGNMENTS_FILE, assignments);
  saveData(BADGES_FILE, badges);
  saveData(LOGS_FILE, logs);
  saveData(TOKENS_FILE, tokens);
  saveData(FEEDBACK_FILE, feedbacks);
  saveData(CHAT_HISTORY_FILE, chatHistory);
  res.json({ msg: "✅ Data saved (reset trigger)" });
});

// ----------------------
// Final: Start server
// ----------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

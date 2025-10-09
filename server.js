// server.js
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

// ✅ Serve static frontend files
app.use(express.static("frontend"));

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
let users = loadData(USERS_FILE, []);           
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

// Admin account
let adminAccounts = [{ username: "admin", passwordHash: "" }]; // first run setup

// ----------------------
// Utilities
// ----------------------
async function hashPassword(password) { return await bcrypt.hash(password, 10); }
async function comparePassword(password, hash) { return await bcrypt.compare(password, hash); }

function getGreeting() {
  const hour = new Date().getHours();
  if(hour >= 5 && hour < 12) return "Good morning 🌞";
  if(hour >= 12 && hour < 17) return "Good afternoon ☀️";
  if(hour >= 17 && hour < 21) return "Good evening 🌇";
  return "Hello 🌙";
}

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
// Middleware for authentication
// ----------------------
async function authenticateAdmin(req, res, next){
  const { username, password } = req.body;
  const admin = adminAccounts.find(a => a.username===username);
  if(!admin) return res.status(401).json({ msg:"❌ Invalid admin credentials" });
  const valid = await comparePassword(password, admin.passwordHash);
  if(!valid) return res.status(401).json({ msg:"❌ Invalid admin credentials" });
  next();
}

async function authenticateFaculty(req, res, next){
  const { username, password } = req.body;
  const faculty = facultyAccounts.find(f => f.username===username);
  if(!faculty) return res.status(401).json({ msg:"❌ Invalid faculty credentials" });
  const valid = await comparePassword(password, faculty.password);
  if(!valid) return res.status(401).json({ msg:"❌ Invalid faculty credentials" });
  next();
}

// ----------------------
// Admin Routes
// ----------------------
app.post("/admin/setup", async (req,res)=>{
  const { password } = req.body;
  if(adminAccounts[0].passwordHash) return res.status(400).json({ msg:"Admin already set" });
  adminAccounts[0].passwordHash = await hashPassword(password);
  res.json({ msg:"Admin password set successfully" });
});

app.post("/admin/login", async (req,res)=>{
  const { username, password } = req.body;
  const admin = adminAccounts.find(a => a.username===username);
  if(!admin) return res.status(401).json({ msg:"❌ Invalid admin" });
  const valid = await comparePassword(password, admin.passwordHash);
  if(!valid) return res.status(401).json({ msg:"❌ Invalid admin" });
  logAction("Admin logged in", username);
  res.json({ msg:`${getGreeting()}, ${username}! Welcome back Admin!` });
});

app.post("/admin/forgot-password", (req,res)=>{
  const { email } = req.body;
  const token = generateToken();
  tokens.push({ token, username: "admin", expires: Date.now()+3600000 });
  saveData(TOKENS_FILE, tokens);

  transporter.sendMail({
    from: "yourEmail@gmail.com",
    to: email,
    subject: "Admin Password Reset",
    text: `Use this token to reset password: ${token}`
  }, (err)=>{
    if(err) return res.status(500).json({ msg:"Failed to send email", error: err });
    res.json({ msg:"Reset token sent to your email." });
  });
});

app.post("/admin/reset-password", async (req,res)=>{
  const { token, newPassword } = req.body;
  const t = tokens.find(tok => tok.token===token && tok.expires>Date.now());
  if(!t) return res.status(400).json({ msg:"Invalid or expired token" });
  adminAccounts[0].passwordHash = await hashPassword(newPassword);
  tokens = tokens.filter(tok=>tok.token!==token);
  saveData(TOKENS_FILE, tokens);
  res.json({ msg:"Password reset successfully." });
});

// ----------------------
// Other Admin, Faculty, Student, Chatbot routes
// ----------------------
// (Keep all your existing routes as in your original server.js)
// Example:
// app.post("/admin/add-user", authenticateAdmin, ... )
// app.post("/faculty/login", ... )
// app.post("/student/login", ... )
// app.post("/chat", ... )

// ----------------------
// Start server
// ----------------------
app.listen(PORT, ()=>console.log(`🤖 Student Assistant Chatbot API running on port ${PORT}`));

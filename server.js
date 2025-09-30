// server.js
const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const app = express();
app.use(cors());
app.use(express.json());

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
  auth: { user: "sunshinesbright004@gmail.com", pass: "Hari@00412" }
});

// ----------------------
// Middleware
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

// Users
app.post("/admin/add-user", authenticateAdmin, (req,res)=>{
  const { regno, name } = req.body;
  if(users.find(u=>u.regno===regno)) return res.status(400).json({ msg:"User exists" });
  users.push({ regno, name });
  saveData(USERS_FILE, users);
  logAction("Added student", regno);
  res.json({ msg:`Student ${name} (${regno}) added.` });
});

app.post("/admin/remove-user", authenticateAdmin, (req,res)=>{
  const { regno } = req.body;
  const index = users.findIndex(u => u.regno===regno);
  if(index===-1) return res.status(400).json({ msg:"User not found" });
  const removed = users.splice(index,1);
  saveData(USERS_FILE, users);
  logAction("Removed student", regno);
  res.json({ msg:`Removed student ${removed[0].name} (${removed[0].regno})` });
});

// Faculty
app.post("/admin/add-faculty", authenticateAdmin, async (req,res)=>{
  const { username, password, name, department } = req.body;
  if(facultyAccounts.find(f=>f.username===username)) return res.status(400).json({ msg:"Faculty exists" });
  const hash = await hashPassword(password);
  facultyAccounts.push({ username, password: hash, name, department });
  saveData(FACULTY_FILE, facultyAccounts);
  logAction("Added faculty", username);
  res.json({ msg:`Faculty ${name} added.` });
});

app.post("/admin/remove-faculty", authenticateAdmin, (req,res)=>{
  const { username } = req.body;
  const index = facultyAccounts.findIndex(f=>f.username===username);
  if(index===-1) return res.status(400).json({ msg:"Faculty not found" });
  const removed = facultyAccounts.splice(index,1);
  saveData(FACULTY_FILE, facultyAccounts);
  logAction("Removed faculty", username);
  res.json({ msg:`Removed faculty ${removed[0].name}` });
});

// Notices & Exams
app.post("/admin/add-notice", authenticateAdmin, (req,res)=>{
  const { notice } = req.body;
  notices.push(notice);
  saveData(NOTICES_FILE, notices);
  logAction("Notice added", "admin");
  res.json({ msg:"Notice added." });
});

app.post("/admin/add-exam", authenticateAdmin, (req,res)=>{
  const { name, date } = req.body;
  exams.push({ name, date });
  saveData(EXAMS_FILE, exams);
  logAction("Exam added", "admin");
  res.json({ msg:"Exam added." });
});

// Badges
app.post("/admin/assign-badge", authenticateAdmin, (req,res)=>{
  const { username, role } = req.body;
  const index = badges.findIndex(b => b.username===username);
  if(index!==-1) badges[index].role = role;
  else badges.push({ username, role, animated:true });
  saveData(BADGES_FILE, badges);
  logAction("Badge assigned", username);
  res.json({ msg:`Badge ${role} assigned to ${username}` });
});

// Feedback
app.post("/feedback", (req,res)=>{
  const { username, message } = req.body;
  feedbacks.push({ username, message, timestamp: new Date().toISOString() });
  saveData(FEEDBACK_FILE, feedbacks);
  res.json({ msg:"Feedback submitted." });
});

// Faculty login & actions
app.post("/faculty/login", async (req,res)=>{
  const { username, password } = req.body;
  const f = facultyAccounts.find(f => f.username===username);
  if(!f) return res.status(401).json({ msg: "❌ Invalid faculty" });
  const valid = await comparePassword(password, f.password);
  if(!valid) return res.status(401).json({ msg: "❌ Invalid faculty" });
  logAction("Faculty logged in", username);
  res.json({ msg:`${getGreeting()}, ${f.name}! Welcome back.` });
});

// Faculty add note
app.post("/faculty/add-note", (req,res)=>{
  const { studentReg, faculty, note, publicNote } = req.body;
  notes.push({ studentReg, faculty, note, public: publicNote });
  saveData(NOTES_FILE, notes);
  logAction("Note added", faculty);
  res.json({ msg:"Note added." });
});

// Faculty mark attendance
app.post("/faculty/mark-attendance", (req,res)=>{
  const { studentReg, subject, percentage, faculty } = req.body;
  const index = attendance.findIndex(a=>a.regno===studentReg && a.subject===subject);
  if(index!==-1) attendance[index].percentage = percentage;
  else attendance.push({ regno: studentReg, subject, percentage });
  saveData(ATTENDANCE_FILE, attendance);
  logAction("Attendance updated", faculty);
  res.json({ msg:"Attendance updated." });
});

// Faculty add assignment
app.post("/faculty/add-assignment", (req,res)=>{
  const { studentReg, faculty, file } = req.body;
  assignments.push({ studentReg, faculty, file, feedback:"" });
  saveData(ASSIGNMENTS_FILE, assignments);
  logAction("Assignment added", faculty);
  res.json({ msg:"Assignment added." });
});

// Faculty message admin
app.post("/faculty/message-admin", (req,res)=>{
  const { faculty, message } = req.body;
  logs.push({ action:`Faculty message: ${message}`, user: faculty, timestamp: new Date().toISOString() });
  saveData(LOGS_FILE, logs);
  res.json({ msg:"Message sent to admin." });
});

// Student login
app.post("/student/login", (req,res)=>{
  const { regno } = req.body;
  const user = users.find(u => u.regno === regno);
  if(user) return res.json({ msg: `${getGreeting()}, ${user.name}! Welcome back.` });
  res.status(401).json({ msg: "❌ Invalid register number" });
});

// Student get attendance
app.post("/student/attendance", (req,res)=>{
  const { regno } = req.body;
  const data = attendance.filter(a=>a.regno===regno);
  res.json(data);
});

// Student get exams
app.post("/student/exams", (req,res)=>{ res.json(exams); });

// Student get notices
app.post("/student/notices", (req,res)=>{ res.json(notices); });

// Student get notes
app.post("/student/notes", (req,res)=>{
  const { regno } = req.body;
  res.json(notes.filter(n=>n.public || n.studentReg===regno));
});

// Chatbot
app.post("/chat", (req,res)=>{
  const { message } = req.body;
  let reply = "I'm here to help!";
  const msgLower = message.toLowerCase();
  const custom = customResponses.find(c => msgLower.includes(c.trigger));
  if(custom) reply = custom.reply;
  res.json({ reply });
});

// Start server
app.listen(PORT, ()=>console.log(`🤖 Student Assistant Chatbot API running on port ${PORT}`));
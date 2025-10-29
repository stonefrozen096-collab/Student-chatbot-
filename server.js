// ====================== IMPORTS ======================
import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { body, validationResult } from "express-validator";
import { Resend } from "resend";

dotenv.config();

// ====================== APP & SERVER ======================
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());

// ====================== DATABASE CONNECTION ======================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ====================== MODELS ======================
const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "user" },
});

const logSchema = new mongoose.Schema({
  message: String,
  type: String,
  time: { type: Date, default: Date.now }
});

const attendanceSchema = new mongoose.Schema({
  username: String,
  date: String,
  status: String
});

const twoFASchema = new mongoose.Schema({
  email: String,
  code: String,
  expiresAt: Date
});

const User = mongoose.model("User", userSchema);
const Log = mongoose.model("Log", logSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);
const TwoFA = mongoose.model("TwoFA", twoFASchema);

// ====================== HELPERS ======================
async function addLog(message, type = "system") {
  await Log.create({ message, type });
}

function wrap(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ====================== EMAIL (RESEND) ======================
const resend = new Resend(process.env.RESEND_API_KEY);

// ====================== AUTHENTICATION ======================
app.post("/api/register", body("email").isEmail(), wrap(async (req, res) => {
  const { username, email, password } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ error: "Email already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, password: hashed });
  res.json({ ok: true, user });
}));

app.post("/api/login", wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "supersecretkey",
    { expiresIn: "8h" }
  );
  res.json({ ok: true, token, user });
}));

// ====================== PASSWORD RESET (FORGOT/RESET) ======================
app.post("/api/request-reset", wrap(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ ok: false, error: "Email required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ ok: false, error: "User not found" });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await TwoFA.findOneAndUpdate({ email }, { email, code, expiresAt }, { upsert: true });

  try {
    await resend.emails.send({
      from: "no-reply@student-assistant.app",
      to: email,
      subject: "Password Reset Code",
      text: `Your password reset code is ${code}. It will expire in 10 minutes.`
    });
    await addLog(`Password reset email sent to ${email}`, "system");
    res.json({ ok: true, message: "Reset code sent to email" });
  } catch (err) {
    console.error("Email send error", err.message);
    res.status(500).json({ ok: false, error: "Failed to send email" });
  }
}));

app.post("/api/reset-password", wrap(async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword)
    return res.status(400).json({ ok: false, error: "All fields required" });

  const record = await TwoFA.findOne({ email, code });
  if (!record) return res.status(400).json({ ok: false, error: "Invalid or expired code" });
  if (record.expiresAt < new Date()) {
    await TwoFA.deleteOne({ _id: record._id });
    return res.status(400).json({ ok: false, error: "Code expired" });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await User.findOneAndUpdate({ email }, { password: hashed });
  await TwoFA.deleteOne({ _id: record._id });
  await addLog(`Password reset for ${email}`, "system");

  res.json({ ok: true, message: "Password reset successful" });
}));

// ====================== ADMIN / ATTENDANCE / LOGS ======================
app.get("/api/users", wrap(async (req, res) => {
  const users = await User.find({}, "-password");
  res.json(users);
}));

app.get("/api/logs", wrap(async (req, res) => {
  const logs = await Log.find().sort({ time: -1 }).limit(50);
  res.json(logs);
}));

app.post("/api/attendance", wrap(async (req, res) => {
  const { username, date, status } = req.body;
  await Attendance.findOneAndUpdate({ username, date }, { username, date, status }, { upsert: true });
  await addLog(`Attendance saved for ${username}`, "attendance");
  res.json({ ok: true });
}));

// ====================== SOCKET.IO ======================
io.on("connection", (socket) => {
  socket.on("attendance:save", async (payload) => {
    try {
      const { date, records } = payload;
      for (const r of records) {
        await Attendance.findOneAndUpdate({ username: r.username, date }, { ...r }, { upsert: true });
      }
      io.emit("attendanceUpdated", { date, records });
      await addLog("Attendance saved via socket", "socket");
    } catch (err) {
      console.error("attendance socket save error", err.message);
    }
  });
});

// ====================== GLOBAL ERROR HANDLER ======================
app.use((err, req, res, next) => {
  console.error("Server error:", err.message || err);
  res.status(500).json({ error: "Server error", message: err.message });
});

// ====================== SERVER START ======================
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

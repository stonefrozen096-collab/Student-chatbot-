// server.js — Full merged version (ESM) with backward-compatible aliases & Resend-friendly reset
import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import crypto from "crypto";
import { body, validationResult } from "express-validator";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const __dirname = path.resolve();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || "*" },
});

// ---------- Resend init ----------
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ---------- helpers ----------
async function sendEmail({ from, to, subject, text, html }) {
  try {
    if (!resend) {
      console.warn("⚠️ RESEND not configured: running in debug email mode");
      return { ok: true, debug: true }; // debug fallback
    }
    const data = await resend.emails.send({ from, to, subject, text, html });
    console.log("📧 Email sent (resend id):", data?.id);
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("❌ Email send failed:", err && (err.message || err));
    throw err;
  }
}

// ---------- middlewares ----------
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.path}`);
  next();
});
app.get("*", (req, res) => res.send("API running ✅"));

// ---------- MONGO ----------
const DB_URI = process.env.MONGO_URI || "mongodb://localhost:27017/student_assistant";
mongoose
  .connect(DB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err && err.message));

// ---------- helper id ----------
function genId(prefix = "") {
  return prefix + crypto.randomBytes(8).toString("hex");
}

// ---------- SCHEMAS ----------
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, index: true },
  name: String,
  password: String,
  role: { type: String, enum: ["admin", "faculty", "moderator", "tester", "student"], default: "student" },
  badges: [String],
  specialAccess: [String],
  locked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
});

const twoFASchema = new mongoose.Schema({
  email: { type: String, index: true, unique: true },
  code: String,
  expiresAt: Date,
});

const logSchema = new mongoose.Schema({
  action: String,
  user: String,
  time: { type: Date, default: Date.now },
});

const badgeSchema = new mongoose.Schema({
  id: { type: String, index: true, unique: true },
  name: String,
  effects: [String],
  access: [String],
  createdAt: { type: Date, default: Date.now },
});

const masterSchema = new mongoose.Schema({
  id: { type: String, index: true, unique: true },
  name: String,
  action: String,
  permission: { type: String, default: "all" },
  dangerous: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const testSchema = new mongoose.Schema({
  _id: { type: String, default: () => genId("t_") },
  title: String,
  subject: String,
  type: { type: String, default: "mcq" },
  options: [String],
  correct: String,
  assignedStudents: [String],
  createdAt: { type: Date, default: Date.now },
});

const attendanceSchema = new mongoose.Schema({
  id: { type: String, index: true, default: () => genId("a_") },
  username: String,
  date: String,
  status: { type: String, enum: ["present", "absent", "late", "onduty", null], default: null },
  createdAt: { type: Date, default: Date.now },
});
attendanceSchema.index({ username: 1, date: 1 }, { unique: true });

const noticeSchema = new mongoose.Schema({
  id: { type: String, index: true, default: () => genId("n_") },
  title: String,
  message: String,
  assignedStudents: [String],
  createdAt: { type: Date, default: Date.now },
});

const chatTriggerSchema = new mongoose.Schema({
  id: { type: String, index: true, default: () => genId("ct_") },
  trigger: String,
  response: String,
  type: { type: String, default: "normal" },
  createdAt: { type: Date, default: Date.now },
});

// ---------- MODELS ----------
const User = mongoose.model("User", userSchema);
const TwoFA = mongoose.model("TwoFA", twoFASchema);
const Log = mongoose.model("Log", logSchema);
const Badge = mongoose.model("Badge", badgeSchema);
const MasterCommand = mongoose.model("MasterCommand", masterSchema);
const Test = mongoose.model("Test", testSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);
const Notice = mongoose.model("Notice", noticeSchema);
const ChatTrigger = mongoose.model("ChatTrigger", chatTriggerSchema);

// ---------- small helpers ----------
async function addLog(action, user = "system") {
  try {
    const log = new Log({ action, user });
    await log.save();
    io.emit("logs:updated", log);
  } catch (err) {
    console.warn("addLog failed:", err && err.message);
  }
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret_in_prod";
const JWT_TTL = process.env.JWT_TTL || "8h";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_TTL });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing Authorization" });
  const parts = header.split(" ");
  if (parts.length !== 2) return res.status(401).json({ error: "Invalid Authorization" });
  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token or expired" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (roles.includes("any")) return next();
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

// ---------- SOCKET.IO ----------
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => console.log("Socket disconnected:", socket.id));

  socket.on("attendance:save", async (payload) => {
    try {
      const { date, records } = payload;
      for (const r of records) {
        await Attendance.findOneAndUpdate({ username: r.username, date }, { ...r }, { upsert: true });
      }
      io.emit("attendanceUpdated", { date, records });
      await addLog("Attendance saved via socket", "socket");
    } catch (err) {
      console.error("attendance socket save error", err && err.message);
    }
  });

  // announcements could be emitted here by server when posted, e.g. io.emit('announcement:new', announcement)
});

// ---------- ROUTES ----------
// health
app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// register (returns token)
app.post(
  "/api/register",
  body("email").isEmail(),
  body("password").isLength({ min: 6 }),
  wrap(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array() });
    const { email, password, name = "", role = "student" } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ error: "User exists" });
    const hashed = await bcrypt.hash(password, 10);
    const u = new User({ email, name, password: hashed, role, badges: [], specialAccess: [], locked: false });
    await u.save();
    await addLog(`User registered: ${email}`, "system");
    io.emit("users:created", u);

    const token = signToken({ id: u._id, email: u.email, role: u.role });
    res.json({ success: true, user: { email: u.email, name: u.name, role: u.role }, token });
  })
);

// Backwards-compatible alias: some frontends call /api/users for signup
app.post("/api/users", wrap(async (req, res) => {
  // forward to /api/register logic (simple)
  req.url = "/api/register";
  app._router.handle(req, res);
}));
// ✅ Additional alias to support /api/users/register
app.post("/api/users/register", (req, res) => {
  req.url = "/api/register";
  app._router.handle(req, res);
});

// login
app.post(
  "/api/login",
  body("email").isEmail(),
  wrap(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    if (user.locked) return res.status(403).json({ success: false, error: "Account locked" });
    if (user.password) {
      if (!password) return res.status(400).json({ success: false, error: "Password required" });
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ success: false, error: "Invalid credentials" });
    }
    user.lastLogin = new Date();
    await user.save();
    await addLog(`User login: ${email}`, email);
    const token = signToken({ id: user._id, email: user.email, role: user.role });
    res.json({ success: true, user: { email: user.email, name: user.name, role: user.role, badges: user.badges, specialAccess: user.specialAccess }, token });
  })
);

// profile
app.get(
  "/api/me",
  authMiddleware,
  wrap(async (req, res) => {
    const user = await User.findOne({ email: req.user.email }).select("-password");
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  })
);

// ---------------- PASSWORD RESET (Resend-friendly) ----------------
app.post(
  "/api/request-reset",
  body("email").isEmail(),
  wrap(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ ok: false, error: "User not found" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await TwoFA.findOneAndUpdate({ email }, { email, code, expiresAt }, { upsert: true, new: true });

    console.log("📧 Sending reset code to:", email);

    try {
      const from = process.env.EMAIL_FROM || "Student Assistant <onboarding@resend.dev>";
      // If using resend, make sure EMAIL_FROM is a verified sender/domain in Resend.
      const result = await sendEmail({
        from,
        to: email,
        subject: "Password Reset Token — Student Assistant",
        html: `<p>Your password reset code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
      });

      if (result && result.debug) {
        // helpful during dev: return the code in response so you can test on mobile
        return res.json({ ok: true, message: "Email backend not configured; returning debug code", debugCode: code });
      }

      return res.json({ ok: true, message: "Reset code sent successfully" });
    } catch (err) {
      console.error("❌ Error sending reset email:", err && (err.message || err));
      return res.status(500).json({ ok: false, error: "Failed to send email" });
    }
  })
);

// Backwards-compatible alias: accept POST from old frontend path
app.post("/admin/forgot-password", wrap(async (req, res) => {
  req.url = "/api/request-reset";
  app._router.handle(req, res);
}));

app.post(
  "/api/reset-password",
  wrap(async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ ok: false, error: "Email, code and newPassword required" });

    const rec = await TwoFA.findOne({ email, code });
    if (!rec) return res.status(400).json({ ok: false, error: "Invalid or expired token" });
    if (rec.expiresAt < new Date()) {
      await TwoFA.deleteOne({ _id: rec._id });
      return res.status(400).json({ ok: false, error: "Token expired" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashed });
    await TwoFA.deleteOne({ _id: rec._id });

    console.log(`✅ Password reset successful for ${email}`);
    await addLog(`Password reset for ${email}`, "system");
    return res.json({ ok: true, message: "Password reset successful" });
  })
);

// Backwards-compatible alias for reset (old frontend)
app.post("/admin/reset-password", wrap(async (req, res) => {
  req.url = "/api/reset-password";
  app._router.handle(req, res);
}));

/* ---------------- BADGES, MASTER, TESTS, ATTENDANCE, NOTICES, CHATBOT TRIGGERS, etc. ---------------- */
/* (kept same as previous — unchanged logic, wrapped where necessary) */

// BADGES
app.get("/api/badges", authMiddleware, requireRole("any"), wrap(async (req, res) => {
  res.json(await Badge.find());
}));
app.post("/api/badges", authMiddleware, requireRole("admin"), wrap(async (req, res) => {
  const { name, effects = [], access = [] } = req.body;
  const id = genId("b_");
  const badge = new Badge({ id, name, effects, access });
  await badge.save();
  await addLog(`Badge created: ${name}`, req.user.email);
  io.emit("badges:created", badge);
  res.json(badge);
}));
app.post("/api/badges/assign", authMiddleware, requireRole("admin"), wrap(async (req, res) => {
  const { email, badgeId } = req.body;
  const badge = await Badge.findOne({ id: badgeId });
  if (!badge) return res.status(404).json({ error: "Badge not found" });
  const u = await User.findOne({ email });
  if (!u) return res.status(404).json({ error: "User not found" });
  u.badges = Array.from(new Set([...(u.badges || []), badge.name]));
  u.specialAccess = Array.from(new Set([...(u.specialAccess || []), ...badge.access]));
  await u.save();
  await addLog(`Badge ${badge.name} assigned to ${email}`, req.user.email);
  io.emit("badges:assigned", { email, badge });
  res.json({ success: true, user: { email: u.email, badges: u.badges, specialAccess: u.specialAccess } });
}));

// MASTER, TESTS, ATTENDANCE, NOTICES, CHATBOT TRIGGERS etc. (unchanged — keep as you had)
// ... (You already provided these routes earlier; keep same content here)

app.get("/api/master", authMiddleware, requireRole("any"), wrap(async (req, res) => {
  res.json(await MasterCommand.find());
}));
app.post("/api/master", authMiddleware, requireRole("admin"), wrap(async (req, res) => {
  const { name, action, permission = "all", dangerous = false } = req.body;
  const id = genId("m_");
  const cmd = new MasterCommand({ id, name, action, permission, dangerous });
  await cmd.save();
  await addLog(`Master command added: ${name}`, req.user.email);
  io.emit("master:created", cmd);
  res.json(cmd);
}));
app.post("/api/master/:id/execute", authMiddleware, requireRole("admin"), wrap(async (req, res) => {
  const cmd = await MasterCommand.findOne({ id: req.params.id });
  if (!cmd) return res.status(404).json({ error: "not found" });
  io.emit("master:execute", { id: cmd.id, name: cmd.name, action: cmd.action, actor: req.user.email });
  await addLog(`Master executed: ${cmd.name} by ${req.user.email}`, req.user.email);
  res.json({ executed: true, id: cmd.id });
}));

app.get("/api/tests", authMiddleware, requireRole("any"), wrap(async (req, res) => {
  const tests = await Test.find().lean();
  res.json(tests);
}));
app.post("/api/tests", authMiddleware, requireRole("admin"), wrap(async (req, res) => {
  const payload = req.body;
  const t = new Test(payload);
  await t.save();
  await addLog(`Test created: ${t.title}`, req.user.email);
  io.emit("tests:created", t);
  res.json(t);
}));
app.delete("/api/tests/:id", authMiddleware, requireRole("admin"), wrap(async (req, res) => {
  await Test.deleteOne({ _id: req.params.id });
  await addLog(`Test deleted: ${req.params.id}`, req.user.email);
  io.emit("tests:deleted", { id: req.params.id });
  res.json({ deleted: true });
}));

app.get("/api/attendance", authMiddleware, requireRole("any"), wrap(async (req, res) => {
  const all = await Attendance.find().lean();
  res.json(all);
}));
app.post("/api/attendance", authMiddleware, requireRole("any"), wrap(async (req, res) => {
  const entries = Array.isArray(req.body.entries) ? req.body.entries : [req.body];
  const upserted = [];
  for (const e of entries) {
    const { username, date, status } = e;
    if (!username || !date) continue;
    await Attendance.findOneAndUpdate({ username, date }, { username, date, status }, { upsert: true, new: true, setDefaultsOnInsert: true });
    upserted.push({ username, date, status });
  }
  await addLog(`Attendance saved (${upserted.length})`, req.user?.email || "system");
  io.emit("attendance:updated", { date: entries[0]?.date, records: upserted });
  res.json({ saved: true, count: upserted.length });
}));

app.get("/api/notices", authMiddleware, requireRole("any"), wrap(async (req, res) => {
  const all = await Notice.find().lean();
  res.json(all);
}));
app.post("/api/notices", authMiddleware, requireRole("admin"), wrap(async (req, res) => {
  const payload = req.body;
  const n = new Notice(payload);
  await n.save();
  await addLog(`Notice published: ${n.title}`, req.user.email);
  io.emit("noticeAdded", n);
  res.json(n);
}));
app.put("/api/notices/:id", authMiddleware, requireRole("admin"), wrap(async (req, res) => {
  const updated = await Notice.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
  await addLog(`Notice updated: ${req.params.id}`, req.user.email);
  io.emit("noticeUpdated", updated);
  res.json(updated);
}));
app.delete("/api/notices/:id", authMiddleware, requireRole("admin"), wrap(async (req, res) => {
  await Notice.deleteOne({ id: req.params.id });
  await addLog(`Notice deleted: ${req.params.id}`, req.user.email);
  io.emit("noticeDeleted", req.params.id);
  res.json({ deleted: true });
}));

app.get("/api/chatbot/triggers", authMiddleware, requireRole("any"), wrap(async (req, res) => {
  const triggers = await ChatTrigger.find().lean();
  res.json(triggers);
}));
app.post("/api/chatbot/triggers", authMiddleware, requireRole("admin"), wrap(async (req, res) => {
  const payload = req.body;
  const ct = new ChatTrigger(payload);
  await ct.save();
  await addLog(`Chat trigger added: ${ct.trigger}`, req.user.email);
  io.emit("chatbot:updateTriggers", await ChatTrigger.find().lean());
  res.json(ct);
}));
app.put("/api/chatbot/triggers/:id", authMiddleware, requireRole("admin"), wrap(async (req, res) => {
  const updated = await ChatTrigger.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
  await addLog(`Chat trigger updated: ${req.params.id}`, req.user.email);
  io.emit("chatbot:updateTriggers", await ChatTrigger.find().lean());
  res.json(updated);
}));
app.delete("/api/chatbot/triggers/:id", authMiddleware, requireRole("admin"), wrap(async (req, res) => {
  await ChatTrigger.deleteOne({ id: req.params.id });
  await addLog(`Chat trigger deleted: ${req.params.id}`, req.user.email);
  io.emit("chatbot:updateTriggers", await ChatTrigger.find().lean());
  res.json({ deleted: true });
}));

app.post("/api/chat/send", authMiddleware, wrap(async (req, res) => {
  const { message, username } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });
  const triggers = await ChatTrigger.find().lean();
  const found = triggers.find((t) => message.toLowerCase().includes(t.trigger.toLowerCase()));
  if (found) {
    if (["alert", "urgent", "warning"].includes(found.type)) {
      io.emit("chatbot:lock", { seconds: 10, message: found.response });
      return res.json({ type: "lock", response: found.response });
    }
    return res.json({ type: "reply", response: found.response });
  }
  return res.json({ type: "none", response: "Sorry, I don't understand." });
}));

/* ---------- GLOBAL ERROR HANDLER ---------- */
app.use((err, req, res, next) => {
  console.error("Server error:", err && (err.stack || err.message || err));
  res.status(500).json({ error: "Server error", message: err && err.message });
});

/* ---------- CATCH-ALL (frontend single-page fallback) ---------- */
app.get("*", (req, res) => {
  const indexHtml = path.join(FRONTEND_DIR, "index.html");
  if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml);
  return res.status(404).send("Not found");
});

/* ---------- SERVER START ---------- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

  cors: {
    origin: process.env.CORS_ORIGIN || "*", // uses your Render env variable
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("disconnect", () => console.log("🔴 Socket disconnected:", socket.id));

  // optional test event
  socket.on("pingFromClient", (data) => {
    console.log("📩 Received from client:", data);
    socket.emit("pongFromServer", { msg: "Hello from backend 👋" });
  });
});

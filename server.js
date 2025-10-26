// server.js — Production-ready Student Assistant (Part 1)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN || '*' } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('frontend'));

// ---------------- MONGODB ----------------
const DB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/student_assistant';
mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ---------------- SCHEMAS ----------------
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  name: String,
  password: String,
  role: { type: String, enum: ['admin','faculty','moderator','tester','student'], default: 'student' },
  badges: [String],
  specialAccess: [String],
  locked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

const twoFASchema = new mongoose.Schema({
  email: String,
  code: String,
  expiresAt: Date
});

const logSchema = new mongoose.Schema({
  action: String,
  user: String,
  time: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const TwoFA = mongoose.model('TwoFA', twoFASchema);
const Log = mongoose.model('Log', logSchema);

// ---------------- EMAIL ----------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// ---------------- HELPERS ----------------
function genId(prefix='') { return prefix + crypto.randomBytes(8).toString('hex'); }
async function addLog(action, user='system') {
  const log = new Log({ action, user });
  await log.save();
  io.emit('logs:updated', log);
}

// ---------------- SOCKET.IO ----------------
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));
// ---------------- PART 2: AUTH, USERS, BADGES, MASTER COMMANDS, & 2FA ----------------

const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// ---------- MODELS (additional) ----------
const badgeSchema = new mongoose.Schema({
  id: { type: String, index: true, unique: true },
  name: String,
  effects: [String],
  access: [String],
  createdAt: { type: Date, default: Date.now }
});
const Badge = mongoose.model('Badge', badgeSchema);

const masterSchema = new mongoose.Schema({
  id: { type: String, index: true, unique: true },
  name: String,
  action: String,
  permission: { type: String, default: 'all' },
  dangerous: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const MasterCommand = mongoose.model('MasterCommand', masterSchema);

// ---------- CONFIG ----------
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret_in_prod';
const JWT_TTL = process.env.JWT_TTL || '8h'; // token lifetime

// ---------- HELPERS ----------
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_TTL });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing Authorization' });
  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Invalid Authorization' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (roles.includes('any')) return next();
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// ---------- USER ROUTES ----------

// Register (admin can create staff users via API; public registration can be enabled if desired)
app.post('/api/register',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array() });

    const { email, password, name = '', role = 'student' } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User exists' });
    const hashed = await bcrypt.hash(password, 10);
    const u = new User({ email, name, password: hashed, role, badges: [], specialAccess: [], locked: false });
    await u.save();
    await addLog(`User registered: ${email}`, 'system');
    io.emit('users:created', u);
    res.json({ success: true, user: { email: u.email, name: u.name, role: u.role } });
  });

// Login -> returns JWT
app.post('/api/login',
  body('email').isEmail(),
  async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.locked) return res.status(403).json({ success: false, error: 'Account locked' });

    // For students (no password required in some flows) we still allow passwordless if you want:
    if (['admin','faculty','moderator','tester'].includes(user.role)) {
      if (!password) return res.status(400).json({ success: false, error: 'Password required' });
      const ok = await bcrypt.compare(password, user.password || '');
      if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    } else {
      // If student and you want to permit login without password (e.g., email link), handle accordingly.
      if (password && user.password) {
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
    }

    user.lastLogin = new Date();
    await user.save();
    await addLog(`User login: ${email}`, email);

    const token = signToken({ id: user._id, email: user.email, role: user.role });
    res.json({ success: true, user: { email: user.email, name: user.name, role: user.role, badges: user.badges, specialAccess: user.specialAccess }, token });
  });

// Get current user (requires JWT)
app.get('/api/me', authMiddleware, async (req, res) => {
  const user = await User.findOne({ email: req.user.email }).select('-password');
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

// Admin: list users
app.get('/api/admin/users', authMiddleware, requireRole('admin'), async (req, res) => {
  const all = await User.find().select('-password');
  res.json(all);
});

// Update user (admin or owner)
app.put('/api/users/:email', authMiddleware, async (req, res) => {
  const targetEmail = req.params.email;
  const requester = req.user;
  if (requester.email !== targetEmail && requester.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const updates = { ...req.body };
  if (updates.password) updates.password = await bcrypt.hash(updates.password, 10);
  const u = await User.findOneAndUpdate({ email: targetEmail }, updates, { new: true }).select('-password');
  if (!u) return res.status(404).json({ error: 'Not found' });
  await addLog(`User updated: ${targetEmail}`, requester.email);
  io.emit('users:updated', u);
  res.json(u);
});

// Delete user (admin)
app.delete('/api/users/:email', authMiddleware, requireRole('admin'), async (req, res) => {
  const target = req.params.email;
  const deleted = await User.findOneAndDelete({ email: target });
  if (!deleted) return res.status(404).json({ error: 'Not found' });
  await addLog(`User deleted: ${target}`, req.user.email);
  io.emit('users:deleted', { email: target });
  res.json({ deleted: true });
});

// Lock/unlock (admin)
app.patch('/api/users/:email/lock', authMiddleware, requireRole('admin'), async (req, res) => {
  const { locked } = req.body;
  const u = await User.findOneAndUpdate({ email: req.params.email }, { locked: !!locked }, { new: true });
  if (!u) return res.status(404).json({ error: 'Not found' });
  await addLog(`User ${locked ? 'locked' : 'unlocked'}: ${u.email}`, req.user.email);
  io.emit('users:lock', { email: u.email, locked: !!locked });
  res.json({ email: u.email, locked: u.locked });
});

// ---------- 2FA / RESET FLOW ----------
// Request reset token — creates TwoFA doc and emails or returns debug code when no email config
app.post('/api/request-reset', body('email').isEmail(), async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10); // 10 min
  await TwoFA.findOneAndUpdate({ email }, { email, code, expiresAt }, { upsert: true });

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    await addLog(`Reset requested (debug) for ${email}`, 'system');
    return res.json({ ok: true, debugCode: code, message: 'Email not configured; returning debug code' });
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password reset token — Student Assistant',
      text: `Your reset token: ${code}. Expires in 10 minutes.`
    });
    await addLog(`Reset token sent to ${email}`, 'system');
    res.json({ ok: true, message: 'Token sent' });
  } catch (err) {
    console.error('Email send error', err);
    res.status(500).json({ ok: false, error: 'Failed to send email' });
  }
});

// Verify token + set new password
app.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ ok: false, error: 'email, code and newPassword required' });

  const rec = await TwoFA.findOne({ email, code });
  if (!rec) return res.status(400).json({ ok: false, error: 'Invalid or expired token' });
  if (rec.expiresAt < new Date()) { await TwoFA.deleteOne({ _id: rec._id }); return res.status(400).json({ ok: false, error: 'Token expired' }); }

  const hashed = await bcrypt.hash(newPassword, 10);
  await User.findOneAndUpdate({ email }, { password: hashed });
  await TwoFA.deleteOne({ _id: rec._id });
  await addLog(`Password reset for ${email}`, 'system');
  res.json({ ok: true, message: 'Password reset successful' });
});

// ---------- BADGES ----------
app.get('/api/badges', authMiddleware, requireRole('any'), async (req, res) => {
  const b = await Badge.find();
  res.json(b);
});

app.post('/api/badges', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name, effects = [], access = [] } = req.body;
  const id = genId('b_');
  const badge = new Badge({ id, name, effects, access });
  await badge.save();
  await addLog(`Badge created: ${name}`, req.user.email);
  io.emit('badges:created', badge);
  res.json(badge);
});

app.post('/api/badges/assign', authMiddleware, requireRole('admin'), async (req, res) => {
  const { email, badgeId } = req.body;
  const badge = await Badge.findOne({ id: badgeId });
  if (!badge) return res.status(404).json({ error: 'Badge not found' });
  const u = await User.findOne({ email });
  if (!u) return res.status(404).json({ error: 'User not found' });
  u.badges = Array.from(new Set([...(u.badges || []), badge.name]));
  u.specialAccess = Array.from(new Set([...(u.specialAccess || []), ...badge.access]));
  await u.save();
  await addLog(`Badge ${badge.name} assigned to ${email}`, req.user.email);
  io.emit('badges:assigned', { email, badge });
  res.json({ success: true, user: { email: u.email, badges: u.badges, specialAccess: u.specialAccess } });
});

// ---------- MASTER COMMANDS ----------
app.get('/api/master', authMiddleware, requireRole('any'), async (req, res) => {
  const items = await MasterCommand.find();
  res.json(items);
});

app.post('/api/master', authMiddleware, requireRole('admin'), async (req, res) => {
  const { name, action, permission = 'all', dangerous = false } = req.body;
  const id = genId('m_');
  const cmd = new MasterCommand({ id, name, action, permission, dangerous });
  await cmd.save();
  await addLog(`Master command added: ${name}`, req.user.email);
  io.emit('master:created', cmd);
  res.json(cmd);
});

app.post('/api/master/:id/execute', authMiddleware, requireRole('admin'), async (req, res) => {
  const cmd = await MasterCommand.findOne({ id: req.params.id });
  if (!cmd) return res.status(404).json({ error: 'not found' });
  // Emit instruction—clients decide how to handle actions safely.
  io.emit('master:execute', { id: cmd.id, name: cmd.name, action: cmd.action, actor: req.user.email });
  await addLog(`Master executed: ${cmd.name} by ${req.user.email}`, req.user.email);
  res.json({ executed: true, id: cmd.id });
});

// ---------- LOCKS SYSTEM ----------
app.get('/api/locks', authMiddleware, requireRole('admin'), async (req, res) => {
  res.json(lockData || { allLocked: false, lockedUsers: [] });
});

app.post('/api/locks', authMiddleware, requireRole('admin'), async (req, res) => {
  lockData = { ...(lockData || {}), ...(req.body || {}) };
  // persist into DB or config if desired (for now in-memory plus log)
  await addLog(`Lock state updated: ${JSON.stringify(lockData)}`, req.user.email);
  io.emit('locks:updated', lockData);
  res.json({ saved: true, data: lockData });
});

// ---------- EXPORT / IMPORT (admin only) ----------
app.get('/api/export', authMiddleware, requireRole('admin'), async (req, res) => {
  const users = await User.find().select('-password').lean();
  const badges = await Badge.find().lean();
  const master = await MasterCommand.find().lean();
  const twofas = await TwoFA.find().lean();
  res.json({ users, badges, master, twofas });
});

app.post('/api/import', authMiddleware, requireRole('admin'), async (req, res) => {
  const d = req.body || {};
  // careful: only allow when you trust the uploaded data
  if (d.badges) {
    await Badge.deleteMany({});
    await Badge.insertMany(d.badges.map(b => ({ ...b })));
  }
  if (d.master) {
    await MasterCommand.deleteMany({});
    await MasterCommand.insertMany(d.master);
  }
  if (d.users) {
    // skip passwords or require hashed passwords
    for (const u of d.users) {
      try {
        const ex = await User.findOne({ email: u.email });
        if (!ex) await new User(u).save();
      } catch (e) { console.warn('Import user error', e); }
    }
  }
  await addLog('Data import executed', req.user.email);
  io.emit('data:imported', { by: req.user.email });
  res.json({ imported: true });
});
// ---------- PART 3: TESTS, ATTENDANCE, CHAT TRIGGERS, NOTICES, TwoFA model ----------

/**
 * Assumes mongoose is already required and connected earlier in server.js:
 * const mongoose = require('mongoose');
 */

// ---------- SCHEMAS / MODELS ----------
const twoFASchema = new mongoose.Schema({
  email: { type: String, index: true, unique: true },
  code: String,
  expiresAt: Date
});
const TwoFA = mongoose.model('TwoFA', twoFASchema);

const testSchema = new mongoose.Schema({
  _id: { type: String, default: () => genId('t_') },
  title: String,
  subject: String,
  type: { type: String, default: 'mcq' },
  options: [String],
  correct: String,
  assignedStudents: [String],
  createdAt: { type: Date, default: Date.now }
});
const Test = mongoose.model('Test', testSchema);

const attendanceSchema = new mongoose.Schema({
  id: { type: String, index: true, default: () => genId('a_') },
  username: String,
  date: String, // YYYY-MM-DD
  status: { type: String, enum: ['present','absent','late','onduty', null], default: null },
  createdAt: { type: Date, default: Date.now }
});
attendanceSchema.index({ username: 1, date: 1 }, { unique: true });
const Attendance = mongoose.model('Attendance', attendanceSchema);

const noticeSchema = new mongoose.Schema({
  id: { type: String, index: true, default: () => genId('n_') },
  title: String,
  message: String,
  assignedStudents: [String],
  createdAt: { type: Date, default: Date.now }
});
const Notice = mongoose.model('Notice', noticeSchema);

const chatTriggerSchema = new mongoose.Schema({
  id: { type: String, index: true, default: () => genId('ct_') },
  trigger: String,
  response: String,
  type: { type: String, default: 'normal' }, // normal / alert / urgent / warning
  createdAt: { type: Date, default: Date.now }
});
const ChatTrigger = mongoose.model('ChatTrigger', chatTriggerSchema);

// ---------- TESTS ROUTES ----------
app.get('/api/tests', authMiddleware, requireRole('any'), async (req, res) => {
  const tests = await Test.find().lean();
  res.json(tests);
});

app.post('/api/tests', authMiddleware, requireRole('admin'), async (req, res) => {
  const payload = req.body;
  const t = new Test(payload);
  await t.save();
  await addLog(`Test created: ${t.title}`, req.user.email);
  io.emit('tests:created', t);
  res.json(t);
});

app.delete('/api/tests/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  await Test.deleteOne({ _id: req.params.id });
  await addLog(`Test deleted: ${req.params.id}`, req.user.email);
  io.emit('tests:deleted', { id: req.params.id });
  res.json({ deleted: true });
});

// ---------- ATTENDANCE ROUTES ----------
app.get('/api/attendance', authMiddleware, requireRole('any'), async (req, res) => {
  const all = await Attendance.find().lean();
  res.json(all);
});

app.post('/api/attendance', authMiddleware, requireRole('any'), async (req, res) => {
  // Accept either { entries: [...] } or a single entry object
  const entries = Array.isArray(req.body.entries) ? req.body.entries : [req.body];
  const upserted = [];
  for (const e of entries) {
    const { username, date, status } = e;
    if (!username || !date) continue;
    await Attendance.findOneAndUpdate(
      { username, date },
      { username, date, status },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted.push({ username, date, status });
  }
  await addLog(`Attendance saved (${upserted.length})`, req.user?.email || 'system');
  io.emit('attendance:updated', { date: entries[0]?.date, records: upserted });
  res.json({ saved: true, count: upserted.length });
});

// Export attendance for a date
app.get('/api/attendance/export', authMiddleware, requireRole('admin'), async (req, res) => {
  const date = req.query.date;
  const rows = date ? await Attendance.find({ date }).lean() : await Attendance.find().lean();
  res.json(rows);
});

// ---------- NOTICES ----------
app.get('/api/notices', authMiddleware, requireRole('any'), async (req, res) => {
  const all = await Notice.find().lean();
  res.json(all);
});

app.post('/api/notices', authMiddleware, requireRole('admin'), async (req, res) => {
  const payload = req.body;
  const n = new Notice(payload);
  await n.save();
  await addLog(`Notice published: ${n.title}`, req.user.email);
  io.emit('noticeAdded', n);
  res.json(n);
});

app.put('/api/notices/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const updated = await Notice.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
  await addLog(`Notice updated: ${req.params.id}`, req.user.email);
  io.emit('noticeUpdated', updated);
  res.json(updated);
});

app.delete('/api/notices/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  await Notice.deleteOne({ id: req.params.id });
  await addLog(`Notice deleted: ${req.params.id}`, req.user.email);
  io.emit('noticeDeleted', req.params.id);
  res.json({ deleted: true });
});

// ---------- CHATBOT TRIGGERS ----------
app.get('/api/chatbot/triggers', authMiddleware, requireRole('any'), async (req, res) => {
  const triggers = await ChatTrigger.find().lean();
  res.json(triggers);
});

app.post('/api/chatbot/triggers', authMiddleware, requireRole('admin'), async (req, res) => {
  const payload = req.body;
  const ct = new ChatTrigger(payload);
  await ct.save();
  await addLog(`Chat trigger added: ${ct.trigger}`, req.user.email);
  io.emit('chatbot:updateTriggers', await ChatTrigger.find().lean());
  res.json(ct);
});

app.put('/api/chatbot/triggers/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const updated = await ChatTrigger.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
  await addLog(`Chat trigger updated: ${req.params.id}`, req.user.email);
  io.emit('chatbot:updateTriggers', await ChatTrigger.find().lean());
  res.json(updated);
});

app.delete('/api/chatbot/triggers/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  await ChatTrigger.deleteOne({ id: req.params.id });
  await addLog(`Chat trigger deleted: ${req.params.id}`, req.user.email);
  io.emit('chatbot:updateTriggers', await ChatTrigger.find().lean());
  res.json({ deleted: true });
});

// ---------- SIMPLE BOT-HOOK (example) ----------
// This endpoint simulates a student sending a message to bot; server can check triggers and respond.
app.post('/api/chat/send', authMiddleware, async (req, res) => {
  const { message, username } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const triggers = await ChatTrigger.find().lean();
  const found = triggers.find(t => message.toLowerCase().includes(t.trigger.toLowerCase()));
  if (found) {
    if (['alert', 'urgent', 'warning'].includes(found.type)) {
      // lock chatbot for 10s example by emitting lock event
      io.emit('chatbot:lock', { seconds: 10, message: found.response });
      return res.json({ type: 'lock', response: found.response });
    }
    return res.json({ type: 'reply', response: found.response });
  }
  return res.json({ type: 'none', response: "Sorry, I don't understand." });
});

// ---------- SOCKET.IO: optional server listeners for admin actions ----------
io.on('connection', socket => {
  socket.on('attendance:save', async (payload) => {
    // optional: allow client to send attendance via socket; we'll process and emit attendance:updated
    try {
      const { date, records } = payload;
      for (const r of records) {
        await Attendance.findOneAndUpdate({ username: r.username, date }, { ...r }, { upsert: true });
      }
      io.emit('attendanceUpdated', { date, records });
      await addLog('Attendance saved via socket', 'socket');
    } catch (err) {
      console.error('attendance socket save error', err);
    }
  });
});

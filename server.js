// server.js — Full backend for Student Assistant (Part 1)
// Node >= 14 required

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend')));

// ---------------- DATA FILES ----------------
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BADGES_FILE = path.join(DATA_DIR, 'badges.json');
const MASTER_FILE = path.join(DATA_DIR, 'masterCommands.json');
const CHATBOT_FILE = path.join(DATA_DIR, 'chatbotTriggers.json');
const NOTICES_FILE = path.join(DATA_DIR, 'notices.json');
const TESTS_FILE = path.join(DATA_DIR, 'tests.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const CHAT_HISTORY_FILE = path.join(DATA_DIR, 'chat_history.json');
const LOCKS_FILE = path.join(DATA_DIR, 'locks.json');

// ---------------- HELPERS ----------------
function readJSON(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw) { fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2)); return defaultValue; }
    return JSON.parse(raw);
  } catch (err) { console.error(`readJSON error ${filePath}:`, err); return defaultValue; }
}

function writeJSON(filePath, data) {
  try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); } 
  catch (err) { console.error(`writeJSON error ${filePath}:`, err); }
}

function genId(prefix = '') { return prefix + crypto.randomBytes(8).toString('hex'); }

function addLog(action, user = 'system') {
  const entry = { id: genId('l_'), action, user, time: new Date().toISOString() };
  logs.unshift(entry);
  writeJSON(LOGS_FILE, logs);
  io.emit('logs:updated', entry);
}

function persistAll() {
  writeJSON(USERS_FILE, users);
  writeJSON(BADGES_FILE, badges);
  writeJSON(MASTER_FILE, masterCommands);
  writeJSON(CHATBOT_FILE, chatbotTriggers);
  writeJSON(NOTICES_FILE, notices);
  writeJSON(TESTS_FILE, tests);
  writeJSON(ATTENDANCE_FILE, attendance);
  writeJSON(LOGS_FILE, logs);
  writeJSON(ANALYTICS_FILE, analytics);
  writeJSON(CHAT_HISTORY_FILE, chatHistory);
  writeJSON(LOCKS_FILE, lockData);
}

// ---------------- LOAD INITIAL DATA ----------------
let users = readJSON(USERS_FILE, {});
let badges = readJSON(BADGES_FILE, []);
let masterCommands = readJSON(MASTER_FILE, []);
let chatbotTriggers = readJSON(CHATBOT_FILE, []);
let notices = readJSON(NOTICES_FILE, []);
let tests = readJSON(TESTS_FILE, []);
let attendance = readJSON(ATTENDANCE_FILE, []);
let logs = readJSON(LOGS_FILE, []);
let analytics = readJSON(ANALYTICS_FILE, []);
let chatHistory = readJSON(CHAT_HISTORY_FILE, []);
let lockData = readJSON(LOCKS_FILE, { allLocked: false, lockedUsers: [] });

// ---------------- EMAIL ----------------
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const transporter = nodemailer.createTransport({
  service: 'gmail', auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});
if (!EMAIL_USER || !EMAIL_PASS) console.warn('EMAIL_USER or EMAIL_PASS not set. 2FA/reset emails will fail.');

// ---------------- SOCKET.IO ----------------
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));

  // Chat message handling will go in next part
});
// ---------------- ROUTES — Part 2 ----------------

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// --- USERS CRUD ---
app.get('/api/users', (req, res) => res.json(Object.values(users)));

app.post('/api/users', async (req, res) => {
  const { email, password, name = '', role = 'student' } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  if (users[email]) return res.status(400).json({ error: 'user exists' });

  const hashed = password ? await bcrypt.hash(password, 10) : null;
  users[email] = { email, name, password: hashed, role, badges: [], specialAccess: [], locked: false, createdAt: new Date().toISOString(), lastLogin: null };
  writeJSON(USERS_FILE, users);
  addLog(`User created: ${email}`, 'admin');
  io.emit('users:created', users[email]);
  res.json(users[email]);
});

app.put('/api/users/:email', async (req, res) => {
  const key = req.params.email;
  const user = users[key];
  if (!user) return res.status(404).json({ error: 'not found' });

  const updates = req.body;
  if (updates.password) updates.password = await bcrypt.hash(updates.password, 10);
  users[key] = { ...user, ...updates };
  writeJSON(USERS_FILE, users);
  addLog(`User updated: ${key}`, 'admin');
  io.emit('users:updated', users[key]);
  res.json(users[key]);
});

app.delete('/api/users/:email', (req, res) => {
  const key = req.params.email;
  if (!users[key]) return res.status(404).json({ error: 'not found' });
  delete users[key];
  writeJSON(USERS_FILE, users);
  addLog(`User deleted: ${key}`, 'admin');
  io.emit('users:deleted', { email: key });
  res.json({ deleted: true });
});

// --- LOCK / UNLOCK USERS ---
app.patch('/api/users/:email/lock', (req, res) => {
  const key = req.params.email;
  const { locked } = req.body;
  if (!users[key]) return res.status(404).json({ error: 'not found' });
  users[key].locked = !!locked;
  writeJSON(USERS_FILE, users);
  addLog(`User ${locked ? 'locked' : 'unlocked'}: ${key}`, 'admin');
  io.emit('users:lock', { email: key, locked: !!locked });
  res.json({ email: key, locked: !!locked });
});

// --- LOGIN ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'email required' });

  const user = users[email];
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  if (user.locked) return res.status(403).json({ success: false, error: 'Account locked' });

  const staffRoles = ['admin', 'faculty', 'moderator', 'tester'];
  if (staffRoles.includes(user.role)) {
    if (!password) return res.status(400).json({ success: false, error: 'Password required' });
    if (!user.password) return res.status(403).json({ success: false, error: 'No password set' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  user.lastLogin = new Date().toISOString();
  writeJSON(USERS_FILE, users);
  addLog('User login', email);

  res.json({ success: true, message: 'Login successful', user: { email: user.email, name: user.name, role: user.role, badges: user.badges, specialAccess: user.specialAccess } });
});

// --- 2FA & PASSWORD RESET ---
const twoFactorStore = {}; // email -> { code, expiresAt }
function gen2FACode() { return Math.floor(100000 + Math.random() * 900000).toString(); }

app.post('/api/send-2fa', async (req, res) => {
  const { email } = req.body;
  if (!email || !users[email]) return res.status(404).json({ sent: false, error: 'User not found' });

  const code = gen2FACode();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  twoFactorStore[email] = { code, expiresAt };

  try {
    if (!EMAIL_USER || !EMAIL_PASS) return res.json({ sent: true, debugCode: code });
    await transporter.sendMail({
      from: EMAIL_USER, to: email, subject: 'Student Assistant — 2FA code',
      text: `Your password reset code: ${code}. Expires in 5 minutes.`
    });
    addLog(`2FA code sent to ${email}`, 'system');
    res.json({ sent: true });
  } catch (err) {
    console.error('send-2fa error', err);
    res.status(500).json({ sent: false, error: err.message });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) 
    return res.status(400).json({ success: false, error: 'email, code, newPassword required' });

  const rec = twoFactorStore[email];
  if (!rec) return res.status(400).json({ success: false, error: 'No 2FA requested' });
  if (Date.now() > rec.expiresAt) { delete twoFactorStore[email]; return res.status(400).json({ success: false, error: 'Code expired' }); }
  if (rec.code !== code) return res.status(400).json({ success: false, error: 'Invalid code' });

  users[email].password = await bcrypt.hash(newPassword, 10);
  writeJSON(USERS_FILE, users);
  delete twoFactorStore[email];
  addLog(`Password reset for ${email}`, 'system');
  res.json({ success: true, message: 'Password reset OK' });
});

// --- CHAT & BOT TEST ---
app.get('/api/chat/history', (req, res) => res.json(chatHistory));

app.post('/api/chat/history', (req, res) => {
  const entry = { id: genId('ch_'), ...req.body, time: new Date().toISOString() };
  chatHistory.push(entry);
  writeJSON(CHAT_HISTORY_FILE, chatHistory);
  io.emit('chat:message', entry);
  res.json(entry);
});

// Bot test endpoint
app.get('/bot-test', (req, res) => {
  const bot = Object.values(users).find(u => u.bot);
  if (!bot) return res.status(404).send('No bot found');
  res.send(`Bot running: ${bot.username}`);
});
// ---------------- ROUTES — Part 3 ----------------

// ---------------- BADGES CRUD ----------------
app.get('/api/badges', (req, res) => res.json(badges));

app.post('/api/badges', (req, res) => {
  const { name, effects = [], access = [] } = req.body;
  const badge = { id: genId('b_'), name, effects, access };
  badges.push(badge);
  writeJSON(BADGES_FILE, badges);
  addLog(`Badge created: ${name}`, 'admin');
  io.emit('badges:created', badge);
  res.json(badge);
});

app.put('/api/badges/:id', (req, res) => {
  const idx = badges.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  badges[idx] = { ...badges[idx], ...req.body };
  writeJSON(BADGES_FILE, badges);
  addLog(`Badge updated: ${badges[idx].name}`, 'admin');
  io.emit('badges:updated', badges[idx]);
  res.json(badges[idx]);
});

app.delete('/api/badges/:id', (req, res) => {
  badges = badges.filter(b => b.id !== req.params.id);
  writeJSON(BADGES_FILE, badges);
  addLog(`Badge deleted: ${req.params.id}`, 'admin');
  io.emit('badges:deleted', { id: req.params.id });
  res.json({ deleted: true });
});

app.post('/api/badges/assign', (req, res) => {
  const { email, badgeId } = req.body;
  if (!users[email]) return res.status(404).json({ error: 'user not found' });
  const badge = badges.find(b => b.id === badgeId);
  if (!badge) return res.status(404).json({ error: 'badge not found' });

  users[email].badges = users[email].badges || [];
  if (!users[email].badges.includes(badge.name)) users[email].badges.push(badge.name);

  users[email].specialAccess = users[email].specialAccess || [];
  badge.access.forEach(a => { if (!users[email].specialAccess.includes(a)) users[email].specialAccess.push(a); });

  writeJSON(USERS_FILE, users);
  addLog(`Badge ${badge.name} assigned to ${email}`, 'admin');
  io.emit('badges:assigned', { email, badge });
  res.json({ success: true, user: users[email] });
});

// ---------------- MASTER COMMANDS ----------------
app.get('/api/master', (req, res) => res.json(masterCommands));

app.post('/api/master', (req, res) => {
  const { name, action, permission = 'all', dangerous = false } = req.body;
  const cmd = { id: genId('m_'), name, action, permission, dangerous: !!dangerous, createdAt: new Date().toISOString() };
  masterCommands.push(cmd);
  writeJSON(MASTER_FILE, masterCommands);
  addLog(`Master command added: ${name}`, 'admin');
  io.emit('master:created', cmd);
  res.json(cmd);
});

app.put('/api/master/:id', (req, res) => {
  const idx = masterCommands.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  masterCommands[idx] = { ...masterCommands[idx], ...req.body };
  writeJSON(MASTER_FILE, masterCommands);
  addLog(`Master command updated: ${masterCommands[idx].name}`, 'admin');
  io.emit('master:updated', masterCommands[idx]);
  res.json(masterCommands[idx]);
});

app.delete('/api/master/:id', (req, res) => {
  masterCommands = masterCommands.filter(m => m.id !== req.params.id);
  writeJSON(MASTER_FILE, masterCommands);
  addLog(`Master command deleted: ${req.params.id}`, 'admin');
  io.emit('master:deleted', { id: req.params.id });
  res.json({ deleted: true });
});

app.post('/api/master/:id/execute', (req, res) => {
  const cmd = masterCommands.find(m => m.id === req.params.id);
  if (!cmd) return res.status(404).json({ error: 'not found' });
  const actor = req.body.actor || 'admin';
  io.emit('master:execute', { id: cmd.id, name: cmd.name, action: cmd.action, actor });
  addLog(`Master executed: ${cmd.name} by ${actor}`, actor);
  res.json({ executed: true, id: cmd.id });
});

// ---------------- LOCK SYSTEM ----------------
const LOCKS_FILE = path.join(DATA_DIR, 'locks.json');
let lockData = readJSON(LOCKS_FILE, { allLocked: false, lockedUsers: [] });

app.get('/api/locks', (req, res) => res.json(lockData));

app.post('/api/locks', (req, res) => {
  lockData = { ...lockData, ...req.body };
  writeJSON(LOCKS_FILE, lockData);
  addLog(`Lock state updated: allLocked=${lockData.allLocked}`, 'admin');
  io.emit('locks:updated', lockData);
  res.json({ saved: true, data: lockData });
});

// ---------------- TESTS CRUD ----------------
app.get('/api/tests', (req, res) => res.json(tests));

app.post('/api/tests', (req, res) => {
  const t = { _id: genId('t_'), ...req.body, createdAt: new Date().toISOString() };
  tests.push(t);
  writeJSON(TESTS_FILE, tests);
  addLog(`Test created: ${t.title}`, 'admin');
  io.emit('tests:created', t);
  res.json(t);
});

app.put('/api/tests/:id', (req, res) => {
  const idx = tests.findIndex(tt => tt._id === req.params.id || tt.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  tests[idx] = { ...tests[idx], ...req.body };
  writeJSON(TESTS_FILE, tests);
  io.emit('tests:updated', tests[idx]);
  res.json(tests[idx]);
});

app.delete('/api/tests/:id', (req, res) => {
  tests = tests.filter(t => (t._id || t.id) !== req.params.id);
  writeJSON(TESTS_FILE, tests);
  io.emit('tests:deleted', { id: req.params.id });
  res.json({ deleted: true });
});

// ---------------- ATTENDANCE ----------------
app.get('/api/attendance', (req, res) => res.json(attendance));

app.post('/api/attendance', (req, res) => {
  const entries = Array.isArray(req.body.entries) ? req.body.entries : [req.body.entries];
  entries.forEach(e => {
    const entry = { id: genId('a_'), username: e.username, date: e.date, status: e.status, createdAt: new Date().toISOString() };
    attendance = attendance.filter(a => !(a.username === entry.username && a.date === entry.date));
    attendance.push(entry);
  });
  writeJSON(ATTENDANCE_FILE, attendance);
  addLog(`Attendance updated`, 'admin');
  io.emit('attendance:updated', entries);
  res.json({ saved: true });
});

app.get('/api/attendance/export', (req, res) => {
  const date = req.query.date;
  const result = date ? attendance.filter(a => a.date === date) : attendance;
  res.json(result);
});
// ---------------- CHAT & ANALYTICS ----------------
app.get('/api/chat/history', (req, res) => res.json(chatHistory));

app.post('/api/chat/history', (req, res) => {
  const entry = { id: genId('ch_'), ...req.body, time: new Date().toISOString() };
  chatHistory.push(entry);
  writeJSON(CHAT_HISTORY_FILE, chatHistory);
  io.emit('chat:message', entry);
  res.json(entry);
});

app.get('/api/analytics', (req, res) => res.json(analytics));

app.post('/api/analytics', (req, res) => {
  const ev = { id: genId('an_'), ...req.body, time: new Date().toISOString() };
  analytics.push(ev);
  writeJSON(ANALYTICS_FILE, analytics);
  io.emit('analytics:updated', ev);
  res.json(ev);
});

// ---------------- EXPORT / IMPORT ----------------
app.get('/api/export', (req, res) => res.json({
  users, badges, masterCommands, chatbotTriggers, notices, tests, attendance, logs, analytics, chatHistory
}));

app.post('/api/import', (req, res) => {
  const d = req.body || {};
  if (d.users) { users = d.users; writeJSON(USERS_FILE, users); }
  if (d.badges) { badges = d.badges; writeJSON(BADGES_FILE, badges); }
  if (d.masterCommands) { masterCommands = d.masterCommands; writeJSON(MASTER_FILE, masterCommands); }
  if (d.chatbotTriggers) { chatbotTriggers = d.chatbotTriggers; writeJSON(CHATBOT_FILE, chatbotTriggers); }
  if (d.notices) { notices = d.notices; writeJSON(NOTICES_FILE, notices); }
  if (d.tests) { tests = d.tests; writeJSON(TESTS_FILE, tests); }
  if (d.attendance) { attendance = d.attendance; writeJSON(ATTENDANCE_FILE, attendance); }
  if (d.logs) { logs = d.logs; writeJSON(LOGS_FILE, logs); }
  if (d.analytics) { analytics = d.analytics; writeJSON(ANALYTICS_FILE, analytics); }
  if (d.chatHistory) { chatHistory = d.chatHistory; writeJSON(CHAT_HISTORY_FILE, chatHistory); }

  io.emit('data:imported', {});
  addLog('Data imported', 'admin');
  res.json({ imported: true });
});

// ---------------- SERVER EXIT & START ----------------
process.on('SIGINT', () => { console.log('SIGINT, persisting...'); persistAll(); process.exit(); });
process.on('SIGTERM', () => { console.log('SIGTERM, persisting...'); persistAll(); process.exit(); });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Student Assistant server running on port ${PORT}`));

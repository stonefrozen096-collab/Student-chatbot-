// server.js — Unified backend for Student Assistant (full-featured)
// Drop into your project root. Requires node >= 14.

// Imports
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

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static if present
app.use(express.static(path.join(__dirname, 'frontend')));

// Data directory + file paths
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const USERS_FILE = path.join(DATA_DIR, 'users.json');            // object keyed by email
const BADGES_FILE = path.join(DATA_DIR, 'badges.json');          // array of badges
const MASTER_FILE = path.join(DATA_DIR, 'masterCommands.json');  // array
const CHATBOT_FILE = path.join(DATA_DIR, 'chatbotTriggers.json');
const NOTICES_FILE = path.join(DATA_DIR, 'notices.json');
const TESTS_FILE = path.join(DATA_DIR, 'tests.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const CHAT_HISTORY_FILE = path.join(DATA_DIR, 'chat_history.json');

// Helper read/write (safe)
function readJSON(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`readJSON error ${filePath}:`, err);
    return defaultValue;
  }
}
function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`writeJSON error ${filePath}:`, err);
  }
}

// Load initial data
let users = readJSON(USERS_FILE, {});               // object: email -> { email, name, password, role, badges, specialAccess, locked, ... }
let badges = readJSON(BADGES_FILE, []);             // array of { id, name, effects[], access[] }
let masterCommands = readJSON(MASTER_FILE, []);     // array of { id, name, action, permission }
let chatbotTriggers = readJSON(CHATBOT_FILE, []);   // array ...
let notices = readJSON(NOTICES_FILE, []);           // array ...
let tests = readJSON(TESTS_FILE, []);               // array ...
let attendance = readJSON(ATTENDANCE_FILE, []);     // array of { username, date, status }
let logs = readJSON(LOGS_FILE, []);                 // array
let analytics = readJSON(ANALYTICS_FILE, []);       // array
let chatHistory = readJSON(CHAT_HISTORY_FILE, []);  // array

// Nodemailer transporter (use env vars)
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER || '',   // set via env, or replace if you must (not recommended)
    pass: EMAIL_PASS || ''    // app password recommended
  }
});
// If not configured, just warn but keep functionality (sending will fail)
if (!EMAIL_USER || !EMAIL_PASS) {
  console.warn('EMAIL_USER or EMAIL_PASS not set. 2FA/reset emails will fail until configured.');
}

// Utility: generate id/token
function genId(prefix = '') {
  return prefix + crypto.randomBytes(8).toString('hex');
}

// Utility: add log (and persist)
function addLog(action, user = 'system') {
  const entry = { id: genId('l_'), action, user, time: new Date().toISOString() };
  logs.unshift(entry);
  writeJSON(LOGS_FILE, logs);
  io.emit('logs:updated', entry);
}

// Utility: persist all current in-memory stores as needed
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
}

// Socket.io: simple connection logging + namespace events broadcasted below
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

// ---------------------- ROUTES ----------------------
// --- Health
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// --- USERS (object-based)
app.get('/api/users', (req, res) => {
  // return array
  res.json(Object.values(users));
});

// Add user (admin/create)
app.post('/api/users', async (req, res) => {
  const { email, password, name = '', role = 'student' } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  if (users[email]) return res.status(400).json({ error: 'user exists' });

  // for roles that need password, ensure provided; but allow creation of student without password if desired
  const hashed = password ? await bcrypt.hash(password, 10) : null;
  users[email] = {
    email,
    name,
    password: hashed,
    role,
    badges: [],
    specialAccess: [],
    locked: false,
    createdAt: new Date().toISOString(),
    lastLogin: null
  };
  writeJSON(USERS_FILE, users);
  addLog(`User created: ${email}`, 'admin');
  io.emit('users:created', users[email]);
  return res.json(users[email]);
});

// Update user
app.put('/api/users/:email', async (req, res) => {
  const key = req.params.email;
  const user = users[key];
  if (!user) return res.status(404).json({ error: 'not found' });

  // allow updating name/email/password/role/locked etc.
  const updates = req.body;
  if (updates.password) {
    updates.password = await bcrypt.hash(updates.password, 10);
  }
  users[key] = { ...user, ...updates };
  writeJSON(USERS_FILE, users);
  addLog(`User updated: ${key}`, 'admin');
  io.emit('users:updated', users[key]);
  res.json(users[key]);
});

// Delete user
app.delete('/api/users/:email', (req, res) => {
  const key = req.params.email;
  if (!users[key]) return res.status(404).json({ error: 'not found' });
  delete users[key];
  writeJSON(USERS_FILE, users);
  addLog(`User deleted: ${key}`, 'admin');
  io.emit('users:deleted', { email: key });
  res.json({ deleted: true });
});

// Lock/Unlock user
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

// LOGIN (object-based users)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, error: 'email and password required' });

  const user = users[email];
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  if (user.locked) return res.status(403).json({ success: false, error: 'Account locked' });
  if (!user.password) return res.status(403).json({ success: false, error: 'No password set for this account' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });

  user.lastLogin = new Date().toISOString();
  writeJSON(USERS_FILE, users);

  addLog('User login', email);
  res.json({ success: true, message: 'Login successful', user: { email: user.email, name: user.name, role: user.role, badges: user.badges || [], specialAccess: user.specialAccess || [] } });
});

// --- PROFILE (view by admin or self)
app.get('/api/profile/:email', (req, res) => {
  const email = req.params.email;
  const viewer = req.query.viewer || null; // optional viewer for visibility rules
  const user = users[email];
  if (!user) return res.status(404).json({ error: 'not found' });

  // Build profile
  const profile = {
    email: user.email,
    name: user.name,
    role: user.role,
    badges: user.badges || [],
    specialAccess: user.specialAccess || [],
    locked: !!user.locked,
    createdAt: user.createdAt || null,
    lastLogin: user.lastLogin || null
  };

  // notes: other role-specific info can be returned here
  res.json(profile);
});

// --- BADGES (CRUD + assign)
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
  const id = req.params.id;
  const idx = badges.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  badges[idx] = { ...badges[idx], ...req.body };
  writeJSON(BADGES_FILE, badges);
  addLog(`Badge updated: ${badges[idx].name}`, 'admin');
  io.emit('badges:updated', badges[idx]);
  res.json(badges[idx]);
});

app.delete('/api/badges/:id', (req, res) => {
  const id = req.params.id;
  badges = badges.filter(b => b.id !== id);
  writeJSON(BADGES_FILE, badges);
  addLog(`Badge deleted: ${id}`, 'admin');
  io.emit('badges:deleted', { id });
  res.json({ deleted: true });
});

// Assign badge to user (adds badge name to user.badges and merges specialAccess)
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

// --- MASTER COMMANDS (CRUD + execute broadcast) ---
// Commands stored as { id, name, action, permission } where action is string (JS that clients may eval)
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
  const id = req.params.id;
  const idx = masterCommands.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  masterCommands[idx] = { ...masterCommands[idx], ...req.body };
  writeJSON(MASTER_FILE, masterCommands);
  addLog(`Master command updated: ${masterCommands[idx].name}`, 'admin');
  io.emit('master:updated', masterCommands[idx]);
  res.json(masterCommands[idx]);
});

app.delete('/api/master/:id', (req, res) => {
  const id = req.params.id;
  masterCommands = masterCommands.filter(m => m.id !== id);
  writeJSON(MASTER_FILE, masterCommands);
  addLog(`Master command deleted: ${id}`, 'admin');
  io.emit('master:deleted', { id });
  res.json({ deleted: true });
});

// Execute master command (server broadcasts to all clients; clients expected to handle)
app.post('/api/master/:id/execute', (req, res) => {
  const id = req.params.id;
  const actor = req.body.actor || 'admin';
  const cmd = masterCommands.find(m => m.id === id);
  if (!cmd) return res.status(404).json({ error: 'not found' });

  // Broadcast execution: clients listen for 'master:execute' and will decide how to run action
  io.emit('master:execute', { id: cmd.id, name: cmd.name, action: cmd.action, actor });
  addLog(`Master executed: ${cmd.name} by ${actor}`, actor);
  res.json({ executed: true, id: cmd.id });
});

// --- CHATBOT TRIGGERS CRUD ---
app.get('/api/chatbot/triggers', (req, res) => res.json(chatbotTriggers));
app.post('/api/chatbot/triggers', (req, res) => {
  const t = { id: genId('ct_'), ...req.body };
  chatbotTriggers.push(t);
  writeJSON(CHATBOT_FILE, chatbotTriggers);
  addLog(`Chatbot trigger added: ${t.trigger}`, 'admin');
  io.emit('chatbot:updated', t);
  res.json(t);
});
app.put('/api/chatbot/triggers/:id', (req, res) => {
  const id = req.params.id;
  const idx = chatbotTriggers.findIndex(tt => tt.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  chatbotTriggers[idx] = { ...chatbotTriggers[idx], ...req.body };
  writeJSON(CHATBOT_FILE, chatbotTriggers);
  io.emit('chatbot:updated', chatbotTriggers[idx]);
  res.json(chatbotTriggers[idx]);
});
app.delete('/api/chatbot/triggers/:id', (req, res) => {
  const id = req.params.id;
  chatbotTriggers = chatbotTriggers.filter(t => t.id !== id);
  writeJSON(CHATBOT_FILE, chatbotTriggers);
  io.emit('chatbot:deleted', { id });
  res.json({ deleted: true });
});

// --- NOTICES CRUD ---
app.get('/api/notices', (req, res) => res.json(notices));
app.post('/api/notices', (req, res) => {
  const n = { id: genId('no_'), ...req.body, createdAt: new Date().toISOString() };
  notices.push(n);
  writeJSON(NOTICES_FILE, notices);
  addLog(`Notice created: ${n.title}`, 'admin');
  io.emit('notices:created', n);
  res.json(n);
});
app.put('/api/notices/:id', (req, res) => {
  const id = req.params.id;
  const idx = notices.findIndex(n => n.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  notices[idx] = { ...notices[idx], ...req.body };
  writeJSON(NOTICES_FILE, notices);
  io.emit('notices:updated', notices[idx]);
  res.json(notices[idx]);
});
app.delete('/api/notices/:id', (req, res) => {
  const id = req.params.id;
  notices = notices.filter(n => n.id !== id);
  writeJSON(NOTICES_FILE, notices);
  io.emit('notices:deleted', { id });
  res.json({ deleted: true });
});

// Broadcast notice immediately (helper/master command may call this)
app.post('/api/notices/broadcast', (req, res) => {
  const { message, type = 'global' } = req.body;
  addLog(`Notice broadcast: ${message}`, 'admin');
  io.emit('notices:broadcast', { message, type, time: new Date().toISOString() });
  res.json({ broadcast: true });
});

// --- TESTS CRUD ---
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
  const id = req.params.id;
  const idx = tests.findIndex(tt => tt._id === id || tt.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  tests[idx] = { ...tests[idx], ...req.body };
  writeJSON(TESTS_FILE, tests);
  io.emit('tests:updated', tests[idx]);
  res.json(tests[idx]);
});
app.delete('/api/tests/:id', (req, res) => {
  const id = req.params.id;
  tests = tests.filter(t => (t._id || t.id) !== id);
  writeJSON(TESTS_FILE, tests);
  io.emit('tests:deleted', { id });
  res.json({ deleted: true });
});

// --- ATTENDANCE ---
// attendance entries: { id, username (email), date (YYYY-MM-DD), status: present|absent|late|onduty }
app.get('/api/attendance', (req, res) => res.json(attendance));
app.post('/api/attendance', (req, res) => {
  const entries = req.body.entries || [];
  // accept both single and array
  const arr = Array.isArray(entries) ? entries : [entries];
  arr.forEach(e => {
    const entry = { id: genId('a_'), username: e.username, date: e.date, status: e.status, createdAt: new Date().toISOString() };
    // replace existing same username+date
    attendance = attendance.filter(a => !(a.username === entry.username && a.date === entry.date));
    attendance.push(entry);
  });
  writeJSON(ATTENDANCE_FILE, attendance);
  addLog(`Attendance updated`, 'admin');
  io.emit('attendance:updated', arr);
  res.json({ saved: true });
});

// Export attendance per date or all
app.get('/api/attendance/export', (req, res) => {
  const date = req.query.date;
  const result = date ? attendance.filter(a => a.date === date) : attendance;
  res.json(result);
});

// --- ANALYTICS ---
// store events and aggregated metrics
app.get('/api/analytics', (req, res) => res.json(analytics));
app.post('/api/analytics', (req, res) => {
  const ev = { id: genId('an_'), ...req.body, time: new Date().toISOString() };
  analytics.push(ev);
  writeJSON(ANALYTICS_FILE, analytics);
  io.emit('analytics:updated', ev);
  res.json(ev);
});

// --- LOGS ---
app.get('/api/logs', (req, res) => res.json(logs));
app.post('/api/logs', (req, res) => {
  const { msg, user } = req.body;
  const entry = { id: genId('l_'), msg, user: user || 'system', time: new Date().toISOString() };
  logs.unshift(entry);
  writeJSON(LOGS_FILE, logs);
  io.emit('logs:created', entry);
  res.json(entry);
});

// --- CHAT HISTORY ---
app.get('/api/chat/history', (req, res) => res.json(chatHistory));
app.post('/api/chat/history', (req, res) => {
  const entry = { id: genId('ch_'), ...req.body, time: new Date().toISOString() };
  chatHistory.push(entry);
  writeJSON(CHAT_HISTORY_FILE, chatHistory);
  io.emit('chat:message', entry);
  res.json(entry);
});

// --- IMPORT / EXPORT (whole dataset) ---
app.get('/api/export', (req, res) => {
  const dump = {
    users,
    badges,
    masterCommands,
    chatbotTriggers,
    notices,
    tests,
    attendance,
    logs,
    analytics,
    chatHistory
  };
  res.json(dump);
});

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

// --- 2FA & Password Reset ---
// in-memory code store (sufficient for typical small deployments)
const twoFactorStore = {}; // email -> { code, expiresAt }

function gen2FACode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/api/send-2fa', async (req, res) => {
  const { email } = req.body;
  if (!email || !users[email]) return res.status(404).json({ sent: false, error: 'User not found' });

  const code = gen2FACode();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  twoFactorStore[email] = { code, expiresAt };
  try {
    if (!EMAIL_USER || !EMAIL_PASS) {
      console.warn('Email not configured; returning code in response for dev use');
      return res.json({ sent: true, debugCode: code });
    }
    await transporter.sendMail({
      from: EMAIL_USER,
      to: email,
      subject: 'Student Assistant — 2FA code',
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
  if (!email || !code || !newPassword) return res.status(400).json({ success: false, error: 'email, code, newPassword required' });

  const rec = twoFactorStore[email];
  if (!rec) return res.status(400).json({ success: false, error: 'No 2FA requested' });
  if (Date.now() > rec.expiresAt) { delete twoFactorStore[email]; return res.status(400).json({ success: false, error: 'Code expired' }); }
  if (rec.code !== code) return res.status(400).json({ success: false, error: 'Invalid code' });

  // set password
  users[email].password = await bcrypt.hash(newPassword, 10);
  writeJSON(USERS_FILE, users);
  delete twoFactorStore[email];
  addLog(`Password reset for ${email}`, 'system');
  res.json({ success: true, message: 'Password reset OK' });
});

// --- SEARCH API (admin-only in front-end; server returns results)
app.get('/api/search/users', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) return res.json([]);
  const results = Object.values(users).filter(u =>
    (u.name && u.name.toLowerCase().includes(q)) ||
    (u.email && u.email.toLowerCase().includes(q)) ||
    (u.role && u.role.toLowerCase().includes(q))
  );
  res.json(results);
});

// --- Real-time push example endpoint (fire arbitrary notify event)
app.post('/api/notify', (req, res) => {
  io.emit('notify', req.body);
  res.json({ success: true });
});

// --- Utility endpoints for client convenience
app.get('/api/state', (req, res) => {
  return res.json({
    users: Object.values(users),
    badges,
    masterCommands,
    chatbotTriggers,
    notices,
    tests,
    attendance,
    logs,
    analytics
  });
});

// Persist on process exit (best-effort)
process.on('SIGINT', () => { console.log('SIGINT, persisting...'); persistAll(); process.exit(); });
process.on('SIGTERM', () => { console.log('SIGTERM, persisting...'); persistAll(); process.exit(); });

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Student Assistant server running on port ${PORT}`));

// ---------- Full Server.js for All Modules ----------
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ----------------------
// Middleware
// ----------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('frontend')); // serve your frontend files

// ----------------------
// Data files
// ----------------------
const DATA_DIR = 'data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BADGES_FILE = path.join(DATA_DIR, 'badges.json');
const MASTER_FILE = path.join(DATA_DIR, 'masterCommands.json');
const CHATBOT_FILE = path.join(DATA_DIR, 'chatbotTriggers.json');
const NOTICES_FILE = path.join(DATA_DIR, 'notices.json');
const TESTS_FILE = path.join(DATA_DIR, 'tests.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');
const CHAT_HISTORY_FILE = path.join(DATA_DIR, 'chat_history.json');

// ----------------------
// Helper Functions
// ----------------------
function readData(file) {
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file)); }
  catch(e){ return []; }
}
function writeData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ----------------------
// Nodemailer Setup (2FA / App Password)
// ----------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'sunshinesbright004@gmail.com',     // replace with your email
    pass: 'chyr mduh bzyk cjok'      // replace with your app password
  }
});

// ----------------------
// WebSocket Setup
// ----------------------
io.on('connection', socket => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// ----------------------
// API Endpoints
// ----------------------

// ---------- USERS ----------
app.get('/api/users', (req, res) => res.json(readData(USERS_FILE)));

app.post('/api/users/add', (req, res) => {
  const users = readData(USERS_FILE);
  const newUser = req.body;
  users.push(newUser);
  writeData(USERS_FILE, users);
  io.emit('userUpdated');
  res.json(newUser);
});

app.put('/api/users/update', (req, res) => {
  const users = readData(USERS_FILE);
  const idx = users.findIndex(u => u.username === req.body.username);
  if (idx !== -1) { users[idx] = req.body; writeData(USERS_FILE, users); io.emit('userUpdated'); res.json(req.body); }
  else res.status(404).send('User not found');
});

app.delete('/api/users/delete', (req,res)=>{
  let users = readData(USERS_FILE);
  users = users.filter(u=>u.email!==req.body.email);
  writeData(USERS_FILE, users);
  io.emit('userUpdated');
  res.json({deleted:true});
});

app.patch('/api/users/lock-toggle', (req,res)=>{
  const users = readData(USERS_FILE);
  const user = users.find(u=>u.email===req.body.email);
  if(user){ user.locked = req.body.locked; writeData(USERS_FILE, users); io.emit('userUpdated'); res.json(user); }
  else res.status(404).send('User not found');
});

// ---------- PROFILE ----------
app.get('/api/profiles', (req,res)=> res.json(readData(USERS_FILE)));
app.put('/api/profiles/update', (req,res)=>{
  const users = readData(USERS_FILE);
  const idx = users.findIndex(u=>u.id===req.body.id);
  if(idx!==-1){ users[idx]=req.body; writeData(USERS_FILE, users); res.json(req.body); io.emit('profileUpdated'); }
  else res.status(404).send('Profile not found');
});

// ---------- BADGES ----------
app.get('/api/badges', (req,res)=> res.json(readData(BADGES_FILE)));
app.post('/api/badges/add', (req,res)=>{
  const badges = readData(BADGES_FILE);
  badges.push(req.body);
  writeData(BADGES_FILE,badges);
  io.emit('badgeUpdated');
  res.json(req.body);
});

// ---------- MASTER COMMANDS ----------
app.get('/api/master', (req,res)=> res.json(readData(MASTER_FILE)));
app.post('/api/master/add', (req,res)=>{
  const commands = readData(MASTER_FILE);
  commands.push(req.body);
  writeData(MASTER_FILE, commands);
  io.emit('masterUpdated');
  res.json(req.body);
});
app.put('/api/master/update', (req,res)=>{
  const commands = readData(MASTER_FILE);
  const idx = commands.findIndex(c=>c.id===req.body.id);
  if(idx!==-1){ commands[idx]=req.body; writeData(MASTER_FILE, commands); io.emit('masterUpdated'); res.json(req.body);}
  else res.status(404).send('Command not found');
});
app.delete('/api/master/delete', (req,res)=>{
  let commands = readData(MASTER_FILE);
  commands = commands.filter(c=>c.id!==req.body.id);
  writeData(MASTER_FILE, commands);
  io.emit('masterUpdated');
  res.json({deleted:true});
});

// ---------- CHATBOT ----------
app.get('/api/chatbot', (req,res)=> res.json(readData(CHATBOT_FILE)));
app.post('/api/chatbot/add', (req,res)=>{
  const triggers = readData(CHATBOT_FILE);
  triggers.push(req.body);
  writeData(CHATBOT_FILE,triggers);
  io.emit('chatbotUpdated');
  res.json(req.body);
});
app.put('/api/chatbot/update', (req,res)=>{
  const triggers = readData(CHATBOT_FILE);
  const idx = triggers.findIndex(t=>t.id===req.body.id);
  if(idx!==-1){ triggers[idx]=req.body; writeData(CHATBOT_FILE,triggers); io.emit('chatbotUpdated'); res.json(req.body);}
  else res.status(404).send('Trigger not found');
});
app.delete('/api/chatbot/delete', (req,res)=>{
  let triggers = readData(CHATBOT_FILE);
  triggers = triggers.filter(t=>t.id!==req.body.id);
  writeData(CHATBOT_FILE, triggers);
  io.emit('chatbotUpdated');
  res.json({deleted:true});
});

// ---------- NOTICES ----------
app.get('/api/notices', (req,res)=> res.json(readData(NOTICES_FILE)));
app.post('/api/notices/add', (req,res)=>{
  const notices = readData(NOTICES_FILE);
  notices.push(req.body);
  writeData(NOTICES_FILE, notices);
  io.emit('noticeUpdated');
  res.json(req.body);
});
app.put('/api/notices/update', (req,res)=>{
  const notices = readData(NOTICES_FILE);
  const idx = notices.findIndex(n=>n.id===req.body.id);
  if(idx!==-1){ notices[idx]=req.body; writeData(NOTICES_FILE, notices); io.emit('noticeUpdated'); res.json(req.body);}
  else res.status(404).send('Notice not found');
});
app.delete('/api/notices/delete', (req,res)=>{
  let notices = readData(NOTICES_FILE);
  notices = notices.filter(n=>n.id!==req.body.id);
  writeData(NOTICES_FILE, notices);
  io.emit('noticeUpdated');
  res.json({deleted:true});
});

// ---------- TESTS ----------
app.get('/api/tests', (req,res)=> res.json(readData(TESTS_FILE)));
app.post('/api/tests/add', (req,res)=>{
  const tests = readData(TESTS_FILE);
  tests.push(req.body);
  writeData(TESTS_FILE, tests);
  io.emit('testUpdated');
  res.json(req.body);
});
app.delete('/api/tests/delete', (req,res)=>{
  let tests = readData(TESTS_FILE);
  tests = tests.filter(t=>t._id!==req.body._id);
  writeData(TESTS_FILE, tests);
  io.emit('testUpdated');
  res.json({deleted:true});
});

// ---------- LOGS ----------
app.get('/api/logs', (req,res)=> res.json(readData(LOGS_FILE)));
app.post('/api/logs/add', (req,res)=>{
  const logs = readData(LOGS_FILE);
  logs.unshift({msg:req.body.msg,time:new Date().toLocaleString()});
  writeData(LOGS_FILE, logs);
  io.emit('logUpdated');
  res.json(req.body);
});

// ---------- ANALYTICS ----------
app.get('/api/analytics', (req,res)=> res.json(readData(ANALYTICS_FILE)));
app.post('/api/analytics/add', (req,res)=>{
  const analytics = readData(ANALYTICS_FILE);
  analytics.push(req.body);
  writeData(ANALYTICS_FILE, analytics);
  io.emit('analyticsUpdated');
  res.json(req.body);
});

// ---------- CHAT HISTORY ----------
app.get('/api/chat/history', (req,res)=> res.json(readData(CHAT_HISTORY_FILE)));
app.post('/api/chat/history/add', (req,res)=>{
  const chats = readData(CHAT_HISTORY_FILE);
  chats.push(req.body);
  writeData(CHAT_HISTORY_FILE, chats);
  io.emit('chatUpdated');
  res.json(req.body);
});

// ---------- IMPORT / EXPORT ----------
app.get('/api/export', (req,res)=>{
  const data = {
    users: readData(USERS_FILE),
    badges: readData(BADGES_FILE),
    masterCommands: readData(MASTER_FILE),
    chatbot: readData(CHATBOT_FILE),
    notices: readData(NOTICES_FILE),
    tests: readData(TESTS_FILE),
    logs: readData(LOGS_FILE),
    analytics: readData(ANALYTICS_FILE),
    chatHistory: readData(CHAT_HISTORY_FILE)
  };
  res.json(data);
});
app.post('/api/import', (req,res)=>{
  const data = req.body;
  if(data.users) writeData(USERS_FILE,data.users);
  if(data.badges) writeData(BADGES_FILE,data.badges);
  if(data.masterCommands) writeData(MASTER_FILE,data.masterCommands);
  if(data.chatbot) writeData(CHATBOT_FILE,data.chatbot);
  if(data.notices) writeData(NOTICES_FILE,data.notices);
  if(data.tests) writeData(TESTS_FILE,data.tests);
  if(data.logs) writeData(LOGS_FILE,data.logs);
  if(data.analytics) writeData(ANALYTICS_FILE,data.analytics);
  if(data.chatHistory) writeData(CHAT_HISTORY_FILE, data.chatHistory);
io.emit('dataImported');
res.json({ imported: true });
});

// ---------- 2FA & Password Reset ----------
const twoFactorStore = {}; // { email: { code, expiresAt } }

function generate2FACode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

app.post('/api/send-2fa', async (req,res)=>{
  const { email } = req.body;
  const user = users.find(u => u.email === email);
  if(!user) return res.status(404).json({ sent: false, error: 'User not found' });

  const code = generate2FACode();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min validity
  twoFactorStore[email] = { code, expiresAt };

  try {
    // Use your existing transporter setup
    await transporter.sendMail({
      from: 'your_email@gmail.com', // ← keep your existing email/password config here
      to: email,
      subject: 'Your 2FA Code',
      text: `Your 2FA code is: ${code}. It expires in 5 minutes.`
    });
    res.json({ sent: true });
  } catch(e) {
    console.error('Failed to send 2FA email', e);
    res.status(500).json({ sent: false, error: e.message });
  }
});

// Verify 2FA code and reset password
app.post('/api/reset-password', async (req,res)=>{
  const { email, code, newPassword } = req.body;
  const record = twoFactorStore[email];

  if(!record) return res.status(400).json({ success: false, error: 'No 2FA request found' });
  if(Date.now() > record.expiresAt){
    delete twoFactorStore[email];
    return res.status(400).json({ success: false, error: '2FA code expired' });
  }
  if(record.code !== code) return res.status(400).json({ success: false, error: 'Invalid 2FA code' });

  const user = users.find(u => u.email === email);
  if(!user) return res.status(404).json({ success: false, error: 'User not found' });

  user.password = await bcrypt.hash(newPassword, 10);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  delete twoFactorStore[email];

  res.json({ success: true, message: 'Password reset successfully' });
});

// ---------- Real-Time Notifications ----------
app.post('/api/notify', (req,res)=>{
  io.emit('notify', req.body);
  res.json({ success: true });
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));

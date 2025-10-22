// ---------- Master Command System (Persistent Lock Version) ----------
import { getMasterCommands, addMasterCommand, editMasterCommand, deleteMasterCommand, fetchUsers, saveUsers } from './api.js';

const socket = io(); // Socket.IO client

let masterCommands = [];
let users = {};
let countdownInterval = null;

// ---------- Preloaded Commands ----------
const preCommands = [
  { name: 'Lock All Temporary', action: 'lockAllUsersPrompt()', permission: 'admin' },
  { name: 'Lock All Permanent', action: 'lockAllUsers(0,true)', permission: 'admin' },
  { name: 'Global Broadcast', action: 'showGlobalMessage("This is a broadcast!")', permission: 'admin' },
  { name: 'Highlight Message', action: 'alert("Highlight executed!")', permission: 'all' },
];

// ---------- Load Users ----------
async function loadUsers() {
  try {
    users = await fetchUsers(); // load from JSON
  } catch (e) {
    console.error('Failed to load users', e);
    users = {};
  }
}

// ---------- Load Master Commands ----------
export async function loadMasterCommands() {
  await loadUsers();
  try {
    masterCommands = await getMasterCommands();
  } catch (e) {
    console.error('Failed to load master commands, using preloaded', e);
    masterCommands = [...preCommands];
  }
  renderMasterCommands();
  checkCurrentUserLock();
}

// ---------- Render Commands ----------
export function renderMasterCommands() {
  const list = document.getElementById('masterList');
  if (!list) return;
  list.innerHTML = '';

  if (!masterCommands.length) {
    const ph = document.createElement('div');
    ph.className = 'placeholder';
    ph.innerText = 'No commands yet.';
    list.appendChild(ph);
    return;
  }

  masterCommands.forEach((cmd, idx) => {
    const div = document.createElement('div');
    div.className = 'commandItem';

    const nameSpan = document.createElement('strong');
    nameSpan.textContent = cmd.name;

    const executeBtn = document.createElement('button');
    executeBtn.textContent = 'Execute';
    executeBtn.addEventListener('click', () => executeMasterById(idx));

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.style.background = 'red';
    deleteBtn.style.color = 'white';
    deleteBtn.addEventListener('click', () => deleteMasterById(idx));

    div.appendChild(nameSpan);
    div.appendChild(executeBtn);
    div.appendChild(deleteBtn);

    list.appendChild(div);
  });
}

// ---------- Add New Command ----------
export async function addNewCommand() {
  const name = prompt('Command Name:');
  if (!name) return;
  const action = prompt('JS Action:');
  if (!action) return;
  const permission = prompt('Permission (all/admin/badge name):', 'all');
  try {
    const newCmd = await addMasterCommand(name, action, permission);
    masterCommands.push(newCmd);
    renderMasterCommands();
    socket.emit('masterCommandAdded', newCmd);
  } catch (e) {
    console.error('Failed to add command', e);
    alert('Failed to add command!');
  }
}

// ---------- Delete Command ----------
export async function deleteMasterById(idx) {
  if (!confirm('Delete this command?')) return;
  const cmd = masterCommands[idx];
  try {
    await deleteMasterCommand(cmd.id);
    masterCommands.splice(idx, 1);
    renderMasterCommands();
    socket.emit('masterCommandDeleted', cmd.id);
  } catch (e) {
    console.error('Failed to delete command', e);
    alert('Failed to delete command!');
  }
}

// ---------- Execute Command ----------
export function executeMasterById(idx, currentUser = getCurrentUser()) {
  const cmd = masterCommands[idx];
  if (!cmd) return;

  if (!hasPermission(cmd, currentUser)) {
    alert('Access denied!');
    return;
  }

  try {
    eval(cmd.action);
    console.log(`Executed: ${cmd.name}`);
  } catch (e) {
    console.error('Command execution failed:', e);
  }
}

// ---------- Check Permission ----------
function hasPermission(cmd, user) {
  if (!user) return false;
  return (
    cmd.permission === 'all' ||
    (cmd.permission === 'admin' && user.role === 'admin') ||
    (user.badges?.includes(cmd.permission)) ||
    (user.specialAccess?.includes(cmd.permission))
  );
}

// ---------- Get Current User ----------
function getCurrentUser() {
  // Replace this with your session or fetched user logic
  // For demo, assuming logged in user stored in window.currentUser
  return window.currentUser || { username: 'admin', role: 'admin', badges: [], specialAccess: [] };
}

// ---------- Global Lock ----------
export async function lockAllUsersPrompt() {
  const durations = { '1 min': 60, '2 min': 120, '5 min': 300 };
  let choice = prompt('Enter lock duration: 1 min / 2 min / 5 min', '1 min');
  let sec = durations[choice] || 60;
  await lockAllUsers(sec);
}

export async function lockAllUsers(sec = 60, permanent = false) {
  await loadUsers();
  Object.values(users).forEach(u => {
    if (u.role !== 'admin') u.locked = true;
  });
  await saveUsers(users);
  renderGlobalLockOverlay(sec, permanent);

  if (!permanent) {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdown, 1000);

    setTimeout(async () => {
      Object.values(users).forEach(u => {
        if (u.role !== 'admin') u.locked = false;
      });
      await saveUsers(users);
      removeGlobalLockOverlay();
      clearInterval(countdownInterval);
    }, sec * 1000);
  }
}

// ---------- Global Lock UI ----------
function renderGlobalLockOverlay(sec, permanent = false) {
  const overlay = document.getElementById('globalLockOverlay');
  overlay.style.display = 'flex';
  document.getElementById('lockMessage').innerText = permanent ? '🔒 All Users Locked Permanently' : '🔒 All Users Locked';
  document.getElementById('countdownTimer').innerText = permanent ? '' : `Unlock in ${sec} sec`;
}

function removeGlobalLockOverlay() {
  const overlay = document.getElementById('globalLockOverlay');
  overlay.style.display = 'none';
  document.getElementById('countdownTimer').innerText = '';
}

// ---------- Show Global Message ----------
export function showGlobalMessage(msg) {
  const overlay = document.getElementById('globalLockOverlay');
  overlay.style.display = 'flex';
  document.getElementById('lockMessage').innerText = msg;
  document.getElementById('countdownTimer').innerText = '';
  setTimeout(() => overlay.style.display = 'none', 3000);
}

// ---------- Check Locked Status on Page Load ----------
function checkCurrentUserLock() {
  const user = getCurrentUser();
  if (user && user.locked && user.role !== 'admin') {
    const overlay = document.getElementById('globalLockOverlay');
    overlay.style.display = 'flex';
    document.getElementById('lockMessage').innerText = '🔒 You are locked!';
    document.getElementById('countdownTimer').innerText = '';
  }
}

// ---------- Socket.IO Listener ----------
socket.on('masterCommandAdded', loadMasterCommands);
socket.on('masterCommandDeleted', loadMasterCommands);
socket.on('masterCommandEdited', loadMasterCommands);

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', loadMasterCommands);

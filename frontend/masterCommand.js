// ---------- Master Command System (JSON-Based + Socket.IO) ----------

import { getMasterCommands, addMasterCommand, editMasterCommand, deleteMasterCommand, fetchLogs, saveLogs, fetchUsers, saveUsers } from './api.js';

const socket = io(); // socket.io client
let masterCommands = [];
let warnings = {};
let globalLock = { active: false, unlockTime: null };
let countdownInterval = null;

// ---------- Preloaded Commands ----------
const preCommands = [
  { id: 'pre1', name: 'Lock All Temporary', action: 'lockAllUsersPrompt()', permission: 'admin' },
  { id: 'pre2', name: 'Lock All Permanent', action: 'lockAllUsers(0,true)', permission: 'admin' },
  { id: 'pre3', name: 'Global Broadcast', action: 'showGlobalMessage("This is a broadcast!")', permission: 'admin' },
  { id: 'pre4', name: 'Sample Test Command', action: 'console.log("Sample Test Run")', permission: 'all' }
];

// ---------- Load Commands ----------
export async function loadMasterCommands() {
  try {
    masterCommands = await getMasterCommands();
  } catch (e) {
    console.error('Failed to load master commands', e);
    masterCommands = [...preCommands];
  }
  renderMasterCommands();
}

// ---------- Render Commands ----------
export function renderMasterCommands() {
  const c = document.getElementById('masterList');
  if (!c) return;
  c.innerHTML = '';

  if (masterCommands.length === 0) {
    const ph = document.createElement('div');
    ph.className = 'placeholder';
    ph.innerText = 'No commands yet.';
    c.appendChild(ph);
    return;
  }

  masterCommands.forEach(cmd => {
    const div = document.createElement('div');
    div.className = 'commandItem';
    div.innerHTML = `
      <strong>${cmd.name}</strong> | Permission: ${cmd.permission || 'all'}
      <button class="btn btn-primary" onclick="executeMasterById('${cmd.id}')">Execute</button>
      <button class="btn btn-ghost" onclick="editMasterAPI('${cmd.id}')">Edit</button>
      <button class="btn btn-danger" onclick="deleteMasterAPI('${cmd.id}')">Delete</button>
    `;
    c.appendChild(div);
    setTimeout(() => div.classList.add('fadeIn'), 50);
  });
}

// ---------- Add Command ----------
window.addNewCommand = async function () {
  const name = prompt('Command Name');
  if (!name) return;
  const action = prompt('JS Action');
  if (!action) return;
  const permission = prompt('Permission (all, badge, special access)', 'all');

  try {
    const newCmd = await addMasterCommand(name, action, permission);
    masterCommands.push(newCmd);
    renderMasterCommands();
    socket.emit('masterCommandAdded', newCmd);
  } catch (e) {
    console.error('Failed to add command', e);
    alert('Failed to add command!');
  }
};

// ---------- Edit Command ----------
window.editMasterAPI = async function (id) {
  const cmd = masterCommands.find(c => c.id === id);
  if (!cmd) return;
  const n = prompt('Command Name', cmd.name); if (n !== null) cmd.name = n;
  const a = prompt('JS Action', cmd.action); if (a !== null) cmd.action = a;
  const p = prompt('Permission', cmd.permission || 'all'); if (p !== null) cmd.permission = p;

  try {
    const updated = await editMasterCommand(id, cmd.name, cmd.action, cmd.permission);
    const idx = masterCommands.findIndex(c => c.id === id);
    masterCommands[idx] = updated;
    renderMasterCommands();
    socket.emit('masterCommandEdited', updated);
  } catch (e) {
    console.error('Failed to edit master command', e);
    alert('Failed to edit command!');
  }
};

// ---------- Delete Command ----------
window.deleteMasterAPI = async function (id) {
  if (!confirm('Delete this command?')) return;
  try {
    await deleteMasterCommand(id);
    masterCommands = masterCommands.filter(c => c.id !== id);
    renderMasterCommands();
    socket.emit('masterCommandDeleted', id);
  } catch (e) {
    console.error('Failed to delete master command', e);
    alert('Failed to delete command!');
  }
};

// ---------- Execute Command ----------
window.executeMasterById = async function (id) {
  const cmd = masterCommands.find(c => c.id === id);
  if (!cmd) return alert('Command not found');

  const user = window.currentUser;
  if (!user) return alert('No logged-in user');

  // Admin always bypasses locks
  const hasPermission = user.role === 'admin' ||
                        cmd.permission === 'all' ||
                        (cmd.permission === 'badge' && user.badges?.length) ||
                        user.specialAccess?.includes(cmd.permission);

  if (!hasPermission) {
    warnings[user.username] = (warnings[user.username] || 0) + 1;
    alert(`Access denied! Warning ${warnings[user.username]}/5`);
    return;
  }

  try {
    eval(cmd.action);
    addLog(`Executed ${cmd.name} by ${user.username}`);
    showCommandOverlay(cmd.name, user.username);
    socket.emit('masterCommandExecuted', { id, user: user.username });
  } catch (e) {
    console.error('Command execution failed', e);
  }
};

// ---------- Overlay ----------
function showCommandOverlay(name, user) {
  const overlay = document.createElement('div');
  overlay.id = 'commandOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;color:white;font-size:2em;flex-direction:column;z-index:9999;';
  overlay.innerHTML = `⚡ ${name} executed by ${user} ⚡`;
  document.body.appendChild(overlay);
  overlay.animate([{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 400, fill: 'forwards' });
  setTimeout(() => overlay.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.9)' }], { duration: 400, fill: 'forwards' }).onfinish = () => overlay.remove(), 1500);
}

// ---------- Global Lock ----------
window.lockAllUsersPrompt = function () {
  const durations = { '1 min': 60, '2 min': 120, '5 min': 300 };
  let choice = prompt('Enter lock duration: 1 min / 2 min / 5 min', '1 min');
  let sec = durations[choice] || 60;
  lockAllUsers(sec, false);
};

window.lockAllUsers = function (sec = 30, permanent = false) {
  globalLock.active = true;
  globalLock.unlockTime = Date.now() + sec * 1000;
  renderGlobalLockAnimation(sec, permanent);

  // Lock users in JSON file
  fetchUsers().then(users => {
    Object.values(users).forEach(u => {
      if (u.role !== 'admin') u.locked = true; // Admin always bypass
    });
    saveUsers(users);
  });

  if (!permanent) {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdown, 1000);
    setTimeout(() => {
      globalLock.active = false;
      globalLock.unlockTime = null;
      removeGlobalLockAnimation();
    }, sec * 1000);
  }
};

function renderGlobalLockAnimation(sec, permanent = false) {
  const overlay = document.getElementById('globalLockOverlay');
  overlay.style.display = 'flex';
  document.getElementById('lockMessage').innerHTML = permanent ? '🔒 All Users Locked Permanently' : '🔒 All Users Locked';
  document.getElementById('countdownTimer').innerText = permanent ? '' : `Unlock in ${sec} sec`;
}

function updateCountdown() {
  const remaining = Math.ceil((globalLock.unlockTime - Date.now()) / 1000);
  document.getElementById('countdownTimer').innerText = remaining > 0 ? `Unlock in ${remaining} sec` : '';
}

function removeGlobalLockAnimation() {
  const overlay = document.getElementById('globalLockOverlay');
  overlay.style.display = 'none';
  document.getElementById('countdownTimer').innerText = '';
}

// ---------- Global Message ----------
window.showGlobalMessage = function (msg) {
  const overlay = document.getElementById('globalLockOverlay');
  overlay.style.display = 'flex';
  document.getElementById('lockMessage').innerHTML = msg;
  document.getElementById('countdownTimer').innerText = '';
  setTimeout(() => overlay.style.display = 'none', 3000);
};

// ---------- Logging ----------
async function addLog(msg) {
  try {
    const logs = await fetchLogs();
    logs.unshift({ msg, time: new Date().toLocaleString() });
    await saveLogs(logs);
  } catch (e) {
    console.error('Failed to log message', e);
  }
}

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', loadMasterCommands);

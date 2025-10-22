// ----------------------
// masterCommand.js — Fully Updated & Persistent
// ----------------------

import { getMasterCommands, addMasterCommand, deleteMasterCommand, executeMasterCommand } from './api.js';
import { fetchJSON, saveJSON } from './jsonUtils.js';

const socket = io();

// ----------------------
// State
// ----------------------
let masterCommands = [];
let lockData = { globalLock: { active: false, unlockTime: null }, users: {} };
let countdownInterval = null;

// ----------------------
// Load Data
// ----------------------
async function loadData() {
  try {
    masterCommands = await getMasterCommands();
  } catch (e) {
    console.error('Failed to load master commands', e);
    masterCommands = [];
  }

  try {
    lockData = await fetchJSON('lock.json');
  } catch (e) {
    console.warn('lock.json not found, initializing new');
    lockData = { globalLock: { active: false, unlockTime: null }, users: {} };
    await saveJSON('lock.json', lockData);
  }

  renderMasterCommands();
  renderGlobalLockOverlay();
}

document.addEventListener('DOMContentLoaded', loadData);

// ----------------------
// Render Commands
// ----------------------
function renderMasterCommands() {
  const container = document.getElementById('masterList');
  container.innerHTML = '';
  if (!masterCommands.length) {
    container.innerHTML = '<div class="placeholder">No commands yet.</div>';
    return;
  }

  masterCommands.forEach(cmd => {
    const div = document.createElement('div');
    div.className = 'commandItem';
    div.id = `cmd-${cmd.id}`;
    div.innerHTML = `
      <strong>${cmd.name}</strong> | Permission: ${cmd.permission || 'all'}
      <button onclick="executeCommand('${cmd.id}')">Execute</button>
      <button onclick="deleteCommand('${cmd.id}')">Delete</button>
    `;
    container.appendChild(div);
  });
}

// ----------------------
// Add Command
// ----------------------
window.addNewCommand = async function () {
  const name = prompt('Command Name');
  if (!name) return;

  const action = prompt('JavaScript Action');
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

// ----------------------
// Delete Command
// ----------------------
window.deleteCommand = async function (id) {
  if (!confirm('Delete this command?')) return;
  try {
    await deleteMasterCommand(id);
    masterCommands = masterCommands.filter(c => c.id !== id);
    renderMasterCommands();
    socket.emit('masterCommandDeleted', id);
  } catch (e) {
    console.error('Failed to delete command', e);
    alert('Failed to delete command!');
  }
};

// ----------------------
// Execute Command
// ----------------------
window.executeCommand = async function (id, user = { username: 'admin', badges: [], specialAccess: [] }) {
  const cmd = masterCommands.find(c => c.id === id);
  if (!cmd) return alert('Command not found');

  const isAdmin = user.username === 'admin';
  const userLocked = lockData.users[user.username]?.locked;
  const globalLockActive = lockData.globalLock.active && !isAdmin;

  const hasAccess = isAdmin || user.badges.includes(cmd.permission) || user.specialAccess.includes(cmd.permission);
  if (!hasAccess) return alert('Access denied! Insufficient permission');
  if (userLocked || globalLockActive) return alert(`Access denied! ${user.username} is locked`);

  const cmdDiv = document.getElementById(`cmd-${id}`);
  if (cmdDiv) {
    cmdDiv.classList.add('command-run');
    setTimeout(() => cmdDiv.classList.remove('command-run'), 1500);
  }

  try {
    await executeMasterCommand(id, user.username);
    eval(cmd.action);
    addLog(`Executed ${cmd.name} by ${user.username}`);
  } catch (e) {
    console.error('Command execution failed', e);
  }
};

// ----------------------
// Lock Users
// ----------------------
window.lockAllUsersPrompt = async function () {
  const durations = { '1 min': 60, '2 min': 120, '5 min': 300 };
  const choice = prompt('Enter lock duration: 1 min / 2 min / 5 min', '1 min');
  const sec = durations[choice] || 60;
  await lockAllUsers(sec, false);
};

async function lockAllUsers(sec = 30, permanent = false) {
  lockData.globalLock.active = true;
  lockData.globalLock.unlockTime = Date.now() + sec * 1000;
  await saveJSON('lock.json', lockData);
  renderGlobalLockOverlay();
  socket.emit('globalLockUpdated', lockData.globalLock);

  if (!permanent) {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdown, 1000);

    setTimeout(async () => {
      lockData.globalLock.active = false;
      lockData.globalLock.unlockTime = null;
      await saveJSON('lock.json', lockData);
      renderGlobalLockOverlay();
      clearInterval(countdownInterval);
      socket.emit('globalLockUpdated', lockData.globalLock);
    }, sec * 1000);
  }
}

// ----------------------
// Render Global Lock Overlay
// ----------------------
function renderGlobalLockOverlay() {
  const overlay = document.getElementById('globalLockOverlay');
  if (lockData.globalLock.active) {
    overlay.style.display = 'flex';
    document.getElementById('lockMessage').innerText = '🔒 All Users Locked';
    updateCountdown();
  } else {
    overlay.style.display = 'none';
  }
}

function updateCountdown() {
  if (!lockData.globalLock.unlockTime) return;
  const remaining = Math.ceil((lockData.globalLock.unlockTime - Date.now()) / 1000);
  const timer = document.getElementById('countdownTimer');
  timer.innerText = remaining > 0 ? `Unlock in ${remaining} sec` : '';
}

// ----------------------
// Logging
// ----------------------
async function addLog(msg) {
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg, user: 'system' })
    });
  } catch (e) {
    console.error('Failed to add log', e);
  }
}

// ----------------------
// Socket.IO Events
// ----------------------
socket.on('masterCommandAdded', loadData);
socket.on('masterCommandDeleted', loadData);
socket.on('globalLockUpdated', (lock) => {
  lockData.globalLock = lock;
  renderGlobalLockOverlay();
});

// ----------------------
// Animations CSS Injection
// ----------------------
const style = document.createElement('style');
style.innerHTML = `
.command-run {
  animation: pulse 1s ease;
}
@keyframes pulse {
  0% { transform: scale(1); background-color: #fff; }
  50% { transform: scale(1.05); background-color: #d0f0fd; }
  100% { transform: scale(1); background-color: #fff; }
}
`;
document.head.appendChild(style);

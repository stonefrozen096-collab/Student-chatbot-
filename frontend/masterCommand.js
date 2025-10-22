// ----------------------
// masterCommand.js — Updated with lock.json persistence
// ----------------------

import { getMasterCommands, addMasterCommand, editMasterCommand, deleteMasterCommand } from './api.js';
import { fetchJSON, saveJSON } from './jsonUtils.js'; // utility to read/write JSON files

const socket = io();

let masterCommands = [];
let lockData = { globalLock: { active: false, unlockTime: null }, users: {} };
let countdownInterval = null;

// ----------------------
// Load lock.json and master commands
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
  renderGlobalLockAnimation();
}

document.addEventListener('DOMContentLoaded', loadData);

// ----------------------
// Render Master Commands
// ----------------------
function renderMasterCommands() {
  const container = document.getElementById('masterList');
  container.innerHTML = '';
  if (masterCommands.length === 0) {
    container.innerHTML = '<div class="placeholder">No commands yet.</div>';
    return;
  }

  masterCommands.forEach(cmd => {
    const div = document.createElement('div');
    div.className = 'commandItem';
    div.innerHTML = `
      <strong>${cmd.name}</strong> | Permission: ${cmd.permission || 'all'}
      <button onclick="executeCommand('${cmd.id}')">Execute</button>
      <button onclick="deleteCommand('${cmd.id}')">Delete</button>
    `;
    container.appendChild(div);
  });
}

// ----------------------
// Add New Command
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

  if (userLocked || globalLockActive) {
    return alert(`Access denied! ${user.username} is locked`);
  }

  try {
    eval(cmd.action); // execute JS code
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
  renderGlobalLockAnimation();

  if (!permanent) {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdown, 1000);

    setTimeout(async () => {
      lockData.globalLock.active = false;
      lockData.globalLock.unlockTime = null;
      await saveJSON('lock.json', lockData);
      removeGlobalLockAnimation();
      clearInterval(countdownInterval);
    }, sec * 1000);
  }
}

// ----------------------
// Render Global Lock Overlay
// ----------------------
function renderGlobalLockAnimation() {
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
  const remaining = Math.ceil((lockData.globalLock.unlockTime - Date.now()) / 1000);
  const timer = document.getElementById('countdownTimer');
  timer.innerText = remaining > 0 ? `Unlock in ${remaining} sec` : '';
}

// ----------------------
// Utilities: Logging & JSON
// ----------------------
async function addLog(msg) {
  try {
    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg, user: 'system' })
    });
    return res.json();
  } catch (e) {
    console.error('Failed to add log', e);
  }
}

// ----------------------
// Socket.IO Listeners
// ----------------------
socket.on('masterCommandAdded', loadData);
socket.on('masterCommandDeleted', loadData);

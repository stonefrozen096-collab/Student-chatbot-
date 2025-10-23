// ----------------------
// masterCommand.js — Fully Updated & Persistent + Broadcast/Full Overlay
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
      <div class="cmd-buttons">
        <button onclick="executeCommand('${cmd.id}')">Execute</button>
        <button onclick="editCommand('${cmd.id}')">Edit</button>
        <button onclick="deleteCommand('${cmd.id}')">Delete</button>
      </div>
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

  const permission = prompt('Permission (all, admin, badge, special)', 'all');

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
// Edit Command
// ----------------------
window.editCommand = async function (id) {
  const cmd = masterCommands.find(c => c.id === id);
  if (!cmd) return alert('Command not found');

  const newName = prompt('Edit Command Name:', cmd.name) || cmd.name;
  const newAction = prompt('Edit JavaScript Action:', cmd.action) || cmd.action;
  const newPermission = prompt('Edit Permission (all, admin, badge, special):', cmd.permission) || cmd.permission;

  const updatedCmd = { ...cmd, name: newName, action: newAction, permission: newPermission };

  try {
    await fetch(`/api/masterCommands/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCmd)
    });
    Object.assign(cmd, updatedCmd);
    renderMasterCommands();
    socket.emit('masterCommandUpdated', updatedCmd);
  } catch (e) {
    console.error('Failed to update command', e);
    alert('Failed to edit command!');
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
// Delete All Commands
// ----------------------
window.deleteAllCommands = async function () {
  if (!confirm('Delete ALL master commands?')) return;
  for (const cmd of [...masterCommands]) {
    await deleteMasterCommand(cmd.id);
  }
  masterCommands = [];
  renderMasterCommands();
  showGlobalMessage('🗑️ All commands deleted!', 2500, 'error');
  socket.emit('masterCommandDeleted', 'all');
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
    showGlobalMessage(`✅ Command "${cmd.name}" executed!`, 3000, 'success');
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
// Global Overlay + Broadcast
// ----------------------
function renderGlobalLockOverlay() {
  const overlay = document.getElementById('globalLockOverlay');
  if (!overlay) return;

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
  if (timer) timer.innerText = remaining > 0 ? `Unlock in ${remaining}s` : '';
}

window.showGlobalMessage = function (text, duration = 3000, type = 'info') {
  let msgBox = document.getElementById('globalMessageBox');
  if (!msgBox) {
    msgBox = document.createElement('div');
    msgBox.id = 'globalMessageBox';
    msgBox.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex; justify-content: center; align-items: center;
      background: rgba(0,0,0,0.7);
      color: white; font-size: 2em; font-weight: bold;
      z-index: 9999; text-align: center;
      animation: fadeInOut ${duration / 1000}s ease;
    `;
    document.body.appendChild(msgBox);
  }
  msgBox.innerText = text;
  msgBox.style.background = type === 'error' ? 'rgba(200,0,0,0.85)' :
                            type === 'success' ? 'rgba(0,150,0,0.85)' : 'rgba(0,0,0,0.75)';
  msgBox.style.display = 'flex';
  setTimeout(() => (msgBox.style.display = 'none'), duration);
};

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
socket.on('masterCommandUpdated', loadData);
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
  50% { transform: scale(1.05); background-color: #c3f7d3; }
  100% { transform: scale(1); background-color: #fff; }
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; }
}
`;
document.head.appendChild(style);

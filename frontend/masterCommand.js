// masterCommand.js — Full Updated Version
import { 
  getMasterCommands, addMasterCommand, editMasterCommand, deleteMasterCommand, executeMasterCommand,
  getUsers, toggleUserLock 
} from './api.js';

const socket = io();

let masterCommands = [];
let currentUser = null;
let globalLock = { active: false, unlockTime: null };
let countdownInterval = null;

// ----------------------
// Get current user from login storage
// ----------------------
if(localStorage.getItem('user')){
  currentUser = JSON.parse(localStorage.getItem('user'));
}

// ----------------------
// Predefined commands (fallback)
// ----------------------
const preCommands = [
  { name: "Lock All Temporary", action: "lockAllUsers(30,false)", permission: "admin" },
  { name: "Lock All Permanent", action: "lockAllUsers(0,true)", permission: "admin" },
  { name: "Global Broadcast", action: "alert('Global message broadcasted')", permission: "admin" }
];

// ----------------------
// Load commands from API
// ----------------------
export async function loadMasterCommands(){
  try{
    const cmds = await getMasterCommands();
    masterCommands = cmds.length ? cmds : preCommands;
  } catch(e){
    console.error("Failed to fetch master commands", e);
    masterCommands = preCommands;
  }
  renderMasterCommands();
}

// ----------------------
// Render Master Commands
// ----------------------
export function renderMasterCommands(){
  const list = document.getElementById('masterList');
  if(!list) return;
  list.innerHTML = '';

  masterCommands.forEach(cmd => {
    const div = document.createElement('div');
    div.className = 'commandItem';
    div.innerHTML = `
      <strong>${cmd.name}</strong> | Permission: ${cmd.permission || 'all'}
      <button class="btn btn-primary">Execute</button>
      ${currentUser?.role === 'admin' ? '<button class="btn btn-danger">Delete</button>' : ''}
    `;
    // Execute button
    div.querySelector('.btn-primary').addEventListener('click', () => executeCommand(cmd));
    // Delete button
    if(currentUser?.role === 'admin'){
      div.querySelector('.btn-danger').addEventListener('click', async () => {
        if(confirm(`Delete command "${cmd.name}"?`)){
          await deleteMasterCommand(cmd.id);
          loadMasterCommands();
          socket.emit('masterCommandUpdated');
        }
      });
    }
    list.appendChild(div);
  });
}
// ----------------------
// masterCommand.js — Part 2
// ----------------------
import { getMasterCommands, addMasterCommand, editMasterCommand, deleteMasterCommand, executeMasterCommand, getUsers, toggleUserLock } from './api.js';

const socket = io(); // Socket.IO connection

let masterCommands = [];
let users = [];
let globalLock = { active: false, unlockTime: null };
let countdownInterval = null;

// Current logged-in user (from localStorage)
const currentUser = JSON.parse(localStorage.getItem('user')) || { username: 'guest', role: 'student', badges: [], specialAccess: [] };

// ----------------------
// Load master commands and users
// ----------------------
export async function loadMasterCommands() {
  try {
    masterCommands = await getMasterCommands();
    users = await getUsers();
  } catch (e) {
    console.error('Failed to load master commands or users:', e);
    masterCommands = [];
    users = [];
  }
  renderMasterCommands();
}

// ----------------------
// Render commands
// ----------------------
export function renderMasterCommands() {
  const list = document.getElementById('masterList');
  list.innerHTML = '';

  if (masterCommands.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder';
    placeholder.innerText = 'No commands yet.';
    list.appendChild(placeholder);
    return;
  }

  masterCommands.forEach(cmd => {
    const item = document.createElement('div');
    item.className = 'commandItem';
    item.innerHTML = `
      <span>${cmd.name}</span>
      <div>
        <button onclick="executeMasterCommandById('${cmd.id}')">Execute</button>
        <button onclick="deleteMasterCommandById('${cmd.id}')">Delete</button>
      </div>
    `;
    list.appendChild(item);
  });
}

// ----------------------
// Add new command
// ----------------------
export async function addNewCommand() {
  const name = prompt('Enter Command Name');
  if (!name) return;
  const action = prompt('Enter JS Action for this command');
  if (!action) return;

  try {
    const newCmd = await addMasterCommand(name, action, 'all'); // default permission all
    masterCommands.push(newCmd);
    renderMasterCommands();
    socket.emit('masterCommandAdded', newCmd);
  } catch (err) {
    console.error('Failed to add command:', err);
    alert('Failed to add command');
  }
}

// ----------------------
// Execute command
// ----------------------
export async function executeMasterCommandById(id) {
  const cmd = masterCommands.find(c => c.id === id);
  if (!cmd) return alert('Command not found');

  // Check locks
  if (globalLock.active && currentUser.role !== 'admin') {
    return alert('⚠️ All users locked! You cannot execute commands.');
  }

  try {
    eval(cmd.action);
    await executeMasterCommand(id, currentUser.username);
    showCommandOverlay(cmd.name);
  } catch (err) {
    console.error('Command execution failed:', err);
    alert('Failed to execute command');
  }
}

// ----------------------
// Delete command
// ----------------------
export async function deleteMasterCommandById(id) {
  if (!confirm('Delete this command?')) return;
  try {
    await deleteMasterCommand(id);
    masterCommands = masterCommands.filter(c => c.id !== id);
    renderMasterCommands();
    socket.emit('masterCommandDeleted', id);
  } catch (err) {
    console.error('Failed to delete command:', err);
    alert('Failed to delete command');
  }
}

// ----------------------
// Global Lock
// ----------------------
export function lockAllUsersPrompt() {
  const sec = parseInt(prompt('Enter lock duration in seconds:', '30'));
  if (!sec) return;
  lockAllUsers(sec);
}

export function lockAllUsers(seconds = 30) {
  globalLock.active = true;
  globalLock.unlockTime = Date.now() + seconds * 1000;
  renderGlobalLockOverlay(seconds);

  users.forEach(u => {
    if (u.username !== currentUser.username) { // admin bypass
      toggleUserLock(u.email, true);
    }
  });

  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const remaining = Math.ceil((globalLock.unlockTime - Date.now()) / 1000);
    document.getElementById('countdownTimer').innerText = remaining > 0 ? `Unlock in ${remaining} sec` : '';
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      globalLock.active = false;
      document.getElementById('globalLockOverlay').style.display = 'none';
      users.forEach(u => toggleUserLock(u.email, false));
    }
  }, 1000);
}

// ----------------------
// Render lock overlay
// ----------------------
function renderGlobalLockOverlay(seconds) {
  const overlay = document.getElementById('globalLockOverlay');
  overlay.style.display = 'flex';
  document.getElementById('lockMessage').innerText = '🔒 All Users Locked';
  document.getElementById('countdownTimer').innerText = `Unlock in ${seconds} sec`;
}

// ----------------------
// Overlay when command executes
// ----------------------
function showCommandOverlay(name) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'rgba(0,0,0,0.7)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.color = '#fff';
  overlay.style.fontSize = '2em';
  overlay.style.zIndex = '9999';
  overlay.innerText = `⚡ Executed: ${name} ⚡`;
  document.body.appendChild(overlay);

  setTimeout(() => overlay.remove(), 1500);
}

// ----------------------
// Socket.IO listeners
// ----------------------
socket.on('masterCommandAdded', cmd => {
  masterCommands.push(cmd);
  renderMasterCommands();
});
socket.on('masterCommandDeleted', id => {
  masterCommands = masterCommands.filter(c => c.id !== id);
  renderMasterCommands();
});

// ----------------------
// Initialize
// ----------------------
document.addEventListener('DOMContentLoaded', loadMasterCommands);
// ----------------------
// masterCommand.js — Part 3 (Persistent Locks)
// ----------------------

import { getUsers, toggleUserLock } from './api.js';

let users = [];
let currentUser = JSON.parse(localStorage.getItem('user')) || { username: 'guest', role: 'student', badges: [], specialAccess: [] };

// ----------------------
// Load users and check locks
// ----------------------
export async function loadUsersAndLocks() {
  try {
    users = await getUsers();
  } catch (err) {
    console.error("Failed to fetch users:", err);
    users = [];
  }

  // Check if current user is locked
  const me = users.find(u => u.username === currentUser.username);
  if (me && me.locked && currentUser.role !== 'admin') {
    showPersistentLockOverlay(me.locked);
  }
}

// ----------------------
// Persistent Lock Overlay
// ----------------------
function showPersistentLockOverlay(lockTimeSeconds = 0) {
  const overlay = document.getElementById('globalLockOverlay');
  overlay.style.display = 'flex';
  document.getElementById('lockMessage').innerText = '🔒 You are Locked';
  if (lockTimeSeconds > 0) {
    document.getElementById('countdownTimer').innerText = `Unlock in ${lockTimeSeconds} sec`;
    let endTime = Date.now() + lockTimeSeconds * 1000;
    const interval = setInterval(() => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000);
      document.getElementById('countdownTimer').innerText = remaining > 0 ? `Unlock in ${remaining} sec` : '';
      if (remaining <= 0) {
        overlay.style.display = 'none';
        clearInterval(interval);
        toggleUserLock(currentUser.email, false); // unlock user in backend
      }
    }, 1000);
  } else {
    document.getElementById('countdownTimer').innerText = '';
  }
}

// ----------------------
// Lock specific user (except admin)
// ----------------------
export async function lockUser(username, seconds = 30) {
  const user = users.find(u => u.username === username);
  if (!user) return;

  if (user.role === 'admin') return; // Admin bypass

  await toggleUserLock(user.email, true);
  showPersistentLockOverlay(seconds);
}

// ----------------------
// Unlock specific user
// ----------------------
export async function unlockUser(username) {
  const user = users.find(u => u.username === username);
  if (!user) return;

  await toggleUserLock(user.email, false);
  document.getElementById('globalLockOverlay').style.display = 'none';
}

// ----------------------
// Apply global lock with persistence
// ----------------------
export async function lockAllUsersPersistent(seconds = 30) {
  users.forEach(async (u) => {
    if (u.role !== 'admin') {
      await toggleUserLock(u.email, true);
    }
  });
  showPersistentLockOverlay(seconds);
}

// ----------------------
// Initialize persistent locks on DOM load
// ----------------------
document.addEventListener('DOMContentLoaded', loadUsersAndLocks);

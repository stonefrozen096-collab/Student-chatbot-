// ----------------------
// masterCommand.js — Fully Updated & Compatible with api.js
// ----------------------
import { getMasterCommands, addMasterCommand, editMasterCommand, deleteMasterCommand, executeMasterCommand } from './api.js';

let masterCommands = [];
let countdownInterval = null;
const socket = io(); // Socket.IO

// ----------------------
// Load Data
// ----------------------
async function loadMasterCommandsData() {
  const data = await getMasterCommands();
  if (!data.error) masterCommands = data;
  renderMasterCommands();
}

document.addEventListener('DOMContentLoaded', loadMasterCommandsData);

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
        <button onclick="executeCommandHandler('${cmd.id}')">Execute</button>
        <button onclick="editCommandHandler('${cmd.id}')">Edit</button>
        <button onclick="deleteCommandHandler('${cmd.id}')">Delete</button>
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

  const newCmd = await addMasterCommand(name, action, permission);
  if (!newCmd.error) {
    masterCommands.push(newCmd);
    renderMasterCommands();
    socket.emit('masterCommandAdded', newCmd);
  }
};

// ----------------------
// Edit Command
// ----------------------
window.editCommandHandler = async function (id) {
  const cmd = masterCommands.find(c => c.id === id);
  if (!cmd) return alert('Command not found');

  const newName = prompt('Edit Command Name:', cmd.name) || cmd.name;
  const newAction = prompt('Edit JavaScript Action:', cmd.action) || cmd.action;
  const newPermission = prompt('Edit Permission (all, admin, badge, etc):', cmd.permission) || cmd.permission;

  const updatedCmd = { ...cmd, name: newName, action: newAction, permission: newPermission };
  const result = await editMasterCommand(id, updatedCmd);

  if (!result.error) {
    Object.assign(cmd, updatedCmd);
    renderMasterCommands();
    socket.emit('masterCommandUpdated', updatedCmd);
  }
};

// ----------------------
// Delete Command
// ----------------------
window.deleteCommandHandler = async function (id) {
  if (!confirm('Delete this command?')) return;
  const result = await deleteMasterCommand(id);
  if (!result.error) {
    masterCommands = masterCommands.filter(c => c.id !== id);
    renderMasterCommands();
    socket.emit('masterCommandDeleted', id);
  }
};

// ----------------------
// Execute Command
// ----------------------
window.executeCommandHandler = async function (id, user = { username: 'admin', badges: [], specialAccess: [] }) {
  const cmd = masterCommands.find(c => c.id === id);
  if (!cmd) return alert('Command not found');

  const isAdmin = user.username === 'admin';
  const hasAccess = isAdmin || user.badges.includes(cmd.permission) || user.specialAccess.includes(cmd.permission);
  if (!hasAccess) return alert('Access denied!');

  const cmdDiv = document.getElementById(`cmd-${id}`);
  if (cmdDiv) {
    cmdDiv.classList.add('command-run');
    setTimeout(() => cmdDiv.classList.remove('command-run'), 1500);
  }

  const result = await executeMasterCommand(id, user.username);
  if (!result.error) {
    try {
      eval(cmd.action);
    } catch (e) {
      console.error('Command execution failed:', e);
    }
  }
};

// ----------------------
// Socket.IO Events
// ----------------------
socket.on('masterCommandAdded', loadMasterCommandsData);
socket.on('masterCommandUpdated', loadMasterCommandsData);
socket.on('masterCommandDeleted', loadMasterCommandsData);

// ----------------------
// Animations CSS
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
`;
document.head.appendChild(style);

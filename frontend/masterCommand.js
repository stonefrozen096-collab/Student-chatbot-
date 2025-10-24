// ---------- Master Command System (API + Socket.IO Version) ----------
import * as api from './api.js';

let masterCommands = [];
let globalLock = { active: false, unlockTime: null };
const socket = io();

// ---------- SOCKET EVENTS ----------
socket.on('master:created', cmd => {
  masterCommands.push(cmd);
  renderMasterCommands();
});

socket.on('master:updated', cmd => {
  const idx = masterCommands.findIndex(c => c.id === cmd.id);
  if (idx !== -1) masterCommands[idx] = cmd;
  renderMasterCommands();
});

socket.on('master:deleted', ({ id }) => {
  masterCommands = masterCommands.filter(c => c.id !== id);
  renderMasterCommands();
});

socket.on('locks:updated', lock => {
  globalLock = lock;
  renderGlobalLockOverlay();
});

// ---------- LOAD INITIAL DATA ----------
async function loadData() {
  try {
    masterCommands = await api.getMasterCommands();
  } catch (err) {
    console.error('Failed to load commands:', err);
    masterCommands = [];
  }

  try {
    globalLock = await api.getLocks();
  } catch (err) {
    console.error('Failed to load lock status:', err);
    globalLock = { active: false, unlockTime: null };
  }

  renderMasterCommands();
  renderGlobalLockOverlay();
}
document.addEventListener('DOMContentLoaded', loadData);

// ---------- RENDER COMMAND LIST ----------
function renderMasterCommands() {
  const container = document.getElementById('masterList');
  if (!container) return;
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
        <button onclick="executeCommand('${cmd.id}')">⚡ Execute</button>
        <button onclick="editCommand('${cmd.id}')">✏️ Edit</button>
        <button onclick="deleteCommand('${cmd.id}')">🗑️ Delete</button>
      </div>
    `;
    container.appendChild(div);
  });
}

// ---------- ADD COMMAND ----------
window.addNewCommand = async function () {
  const name = prompt('Enter command name:');
  if (!name) return;

  const action = prompt('Enter JavaScript action:');
  if (!action) return;

  const permission = prompt('Enter permission (all, admin, badge, special):', 'all');

  try {
    const newCmd = await api.addMasterCommand(name, action, permission);
    masterCommands.push(newCmd);
    renderMasterCommands();
    socket.emit('master:created', newCmd);
    showGlobalMessage(`✅ Command "${name}" added successfully!`, 'success');
  } catch (err) {
    console.error(err);
    showGlobalMessage('❌ Failed to add command!', 'error');
  }
};

// ---------- EDIT COMMAND ----------
window.editCommand = async function (id) {
  const cmd = masterCommands.find(c => c.id === id);
  if (!cmd) return alert('Command not found.');

  const newName = prompt('Edit command name:', cmd.name) || cmd.name;
  const newAction = prompt('Edit JavaScript action:', cmd.action) || cmd.action;
  const newPermission =
    prompt('Edit permission (all, admin, badge, special):', cmd.permission) || cmd.permission;

  try {
    const updatedCmd = await api.editMasterCommand(id, {
      name: newName,
      action: newAction,
      permission: newPermission,
    });
    const idx = masterCommands.findIndex(c => c.id === id);
    if (idx !== -1) masterCommands[idx] = updatedCmd;
    renderMasterCommands();
    socket.emit('master:updated', updatedCmd);
    showGlobalMessage(`✏️ Command "${newName}" updated.`, 'info');
  } catch (err) {
    console.error(err);
    showGlobalMessage('❌ Failed to update command!', 'error');
  }
};

// ---------- DELETE COMMAND ----------
window.deleteCommand = async function (id) {
  if (!confirm('Delete this command?')) return;
  try {
    await api.deleteMasterCommand(id);
    masterCommands = masterCommands.filter(c => c.id !== id);
    renderMasterCommands();
    socket.emit('master:deleted', { id });
    showGlobalMessage('🗑️ Command deleted.', 'warning');
  } catch (err) {
    console.error(err);
    showGlobalMessage('❌ Failed to delete command!', 'error');
  }
};

// ---------- EXECUTE COMMAND ----------
window.executeCommand = async function (id) {
  const cmd = masterCommands.find(c => c.id === id);
  if (!cmd) return;
  try {
    await api.executeMasterCommand(id, { actor: 'admin' });
    socket.emit('master:execute', { id, actor: 'admin' });
    showGlobalMessage(`⚡ Command "${cmd.name}" executed!`, 'success');
  } catch (err) {
    console.error(err);
    showGlobalMessage('❌ Failed to execute command!', 'error');
  }
};

// ---------- GLOBAL LOCK OVERLAY ----------
function renderGlobalLockOverlay() {
  const overlay = document.getElementById('lockOverlay');
  if (!overlay) return;

  if (globalLock.active) {
    overlay.style.display = 'flex';
    const msg = overlay.querySelector('#lockMsg');
    if (msg) msg.innerText = 'All Users Locked';

    if (globalLock.unlockTime) {
      const unlockAt = new Date(globalLock.unlockTime).getTime();
      const timer = overlay.querySelector('#lockTimer');

      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((unlockAt - Date.now()) / 1000));
        if (remaining <= 0) {
          clearInterval(interval);
          globalLock.active = false;
          renderGlobalLockOverlay();
        } else {
          timer.innerText = `Unlocks in ${remaining}s`;
        }
      }, 1000);
    }
  } else {
    overlay.style.display = 'none';
  }
}

// ---------- NOTIFICATION BANNER ----------
function showGlobalMessage(msg, type = 'info') {
  const banner = document.createElement('div');
  banner.className = `notification ${type}`;
  banner.innerText = msg;
  document.body.appendChild(banner);

  banner.animate(
    [{ transform: 'translateY(-50px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
    { duration: 400 }
  );

  setTimeout(() => {
    banner
      .animate(
        [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-50px)', opacity: 0 }],
        { duration: 400 }
      )
      .onfinish = () => banner.remove();
  }, 2500);
}

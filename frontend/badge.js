// ---------- Badge Management (API + Socket.IO Version) ----------
import * as api from './api.js'; // Your API endpoints

let badges = [];
let users = [];

const socket = io(); // Socket.IO client

// ---------- LOAD DATA ----------
async function loadBadgeData() {
  try {
    badges = await api.getBadges();
    users = await api.getUsers();
  } catch (e) {
    console.error('Failed to load badges or users:', e);
    badges = [];
    users = [];
  }

  renderBadges();
  updateAssignBadgeUser();
}

// ---------- CREATE BADGE ----------
document.getElementById('addBadgeForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name = document.getElementById('badgeName').value.trim();
  const effects = Array.from(document.getElementById('badgeEffects').selectedOptions).map(o => o.value);

  if (!name) return alert('Enter badge name');

  // ---- Select users for special access ----
  const userSelect = document.createElement('div');
  userSelect.className = 'popup';
  userSelect.innerHTML = `
    <div class="popupContent">
      <h3>Select users for special access:</h3>
      <select id="specialAccessSelect" multiple>
        ${users.map(u => `<option value="${u.username}">${u.name} (${u.username})</option>`).join('')}
      </select>
      <div class="popupBtns">
        <button id="confirmAccessBtn">Confirm</button>
        <button id="cancelAccessBtn">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(userSelect);

  // ---- Confirm / Cancel handlers ----
  const confirmBtn = userSelect.querySelector('#confirmAccessBtn');
  const cancelBtn = userSelect.querySelector('#cancelAccessBtn');

  confirmBtn.addEventListener('click', async () => {
    const selectedOptions = Array.from(userSelect.querySelector('#specialAccessSelect').selectedOptions);
    const access = selectedOptions.map(o => o.value);
    document.body.removeChild(userSelect);

    try {
      const newBadge = await api.createBadge(name, effects, access);
      badges.push(newBadge);
      renderBadges();
      document.getElementById('addBadgeForm').reset();
      showBadgeStatus(`✅ Badge "${name}" created successfully!`);

      socket.emit('badgeUpdated');
    } catch (err) {
      console.error('Error creating badge:', err);
      alert('Failed to create badge!');
    }
  });

  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(userSelect);
  });
});

// ---------- RENDER BADGES ----------
function renderBadges() {
  const div = document.getElementById('badgeList');
  div.innerHTML = '';
  if (!badges.length) {
    div.innerHTML = '<div class="placeholder">No badges yet.</div>';
    return;
  }

  badges.forEach(b => {
    const d = document.createElement('div');
    d.className = 'badgeItem';
    d.innerHTML = `
      <span class="${b.effects.join(' ')}">${b.name}</span>
      [Effects: ${b.effects.join(', ')} | Access: ${b.access.join(', ')}]
      <button onclick="deleteBadge('${b.id}')">🗑️ Delete</button>
    `;
    div.appendChild(d);
  });
  updateAssignBadgeSelect();
}

// ---------- DELETE BADGE ----------
async function deleteBadge(id) {
  if (!confirm('Delete this badge?')) return;
  try {
    await api.removeBadge(id);
    badges = badges.filter(b => b.id !== id);
    renderBadges();

    socket.emit('badgeUpdated');
  } catch (err) {
    console.error('Error deleting badge:', err);
    alert('Failed to delete badge!');
  }
}

// ---------- ASSIGN BADGE ----------
function updateAssignBadgeUser() {
  const sel = document.getElementById('assignBadgeUser');
  sel.innerHTML = '<option value="">Select User</option>';
  users.forEach(u => {
    sel.insertAdjacentHTML('beforeend', `<option value="${u.username}">${u.name} (${u.username})</option>`);
  });
}

function updateAssignBadgeSelect() {
  const sel = document.getElementById('assignBadgeSelect');
  sel.innerHTML = '<option value="">Select Badge</option>';
  badges.forEach(b => {
    sel.insertAdjacentHTML('beforeend', `<option value="${b.name}">${b.name}</option>`);
  });
}

document.getElementById('assignBadgeBtn').addEventListener('click', async () => {
  const userName = document.getElementById('assignBadgeUser').value;
  const badgeName = document.getElementById('assignBadgeSelect').value;

  if (!userName || !badgeName) return alert('Select user and badge');

  const user = users.find(u => u.username === userName);
  const badge = badges.find(b => b.name === badgeName);
  if (!user || !badge) return;

  try {
    await api.assignBadge(user.username, badge.name);

    if (!user.badges) user.badges = [];
    if (!user.badges.includes(badgeName)) user.badges.push(badgeName);

    user.specialAccess = [...new Set([...(user.specialAccess || []), ...badge.access])];

    showBadgeStatus(`✅ Badge "${badgeName}" assigned to ${user.name}`);
    socket.emit('badgeUpdated');
  } catch (err) {
    console.error('Error assigning badge:', err);
    alert('Failed to assign badge!');
  }
});

// ---------- STATUS ANIMATION ----------
function showBadgeStatus(msg) {
  const status = document.getElementById('badgeStatus');
  status.innerText = msg;
  status.classList.add('badgeAnimation');
  setTimeout(() => status.classList.remove('badgeAnimation'), 2000);
}

// ---------- SOCKET.IO LISTENER ----------
socket.on('badgeUpdated', loadBadgeData);

// ---------- INITIALIZE ----------
document.addEventListener('DOMContentLoaded', loadBadgeData);

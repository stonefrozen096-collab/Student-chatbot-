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

  // Create temporary multi-select for special access
  const accessDiv = document.createElement('div');
  accessDiv.style.position = 'fixed';
  accessDiv.style.top = '50%';
  accessDiv.style.left = '50%';
  accessDiv.style.transform = 'translate(-50%, -50%)';
  accessDiv.style.background = '#fff';
  accessDiv.style.padding = '20px';
  accessDiv.style.border = '1px solid #ccc';
  accessDiv.style.zIndex = 1000;
  accessDiv.innerHTML = `
    <label><strong>Select users for special access:</strong></label><br>
    <select id="specialAccessSelect" multiple size="10" style="width: 300px;">
      ${users.map(u => `<option value="${u.username || u.email}">${u.name} (${u.username || u.email})</option>`).join('')}
    </select><br><br>
    <button id="confirmAccessBtn">Confirm</button>
    <button id="cancelAccessBtn">Cancel</button>
  `;
  document.body.appendChild(accessDiv);

  // Wait for user to select
  const access = await new Promise((resolve) => {
    document.getElementById('confirmAccessBtn').onclick = () => {
      const select = document.getElementById('specialAccessSelect');
      const selected = Array.from(select.selectedOptions).map(o => o.value);
      accessDiv.remove();
      resolve(selected);
    };
    document.getElementById('cancelAccessBtn').onclick = () => {
      accessDiv.remove();
      resolve([]);
    };
  });

  try {
    const newBadge = await api.createBadge(name, effects, access);
    badges.push(newBadge);
    renderBadges();
    document.getElementById('addBadgeForm').reset();
    showBadgeStatus(`✅ Badge "${name}" created successfully!`);

    // Notify all clients
    socket.emit('badgeUpdated');
  } catch (err) {
    console.error('Error creating badge:', err);
    alert('❌ Failed to create badge! Make sure the users exist.');
  }
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
    sel.insertAdjacentHTML('beforeend', `<option value="${u.username || u.email}">${u.name} (${u.username || u.email})</option>`);
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
  const userIdentifier = document.getElementById('assignBadgeUser').value;
  const badgeName = document.getElementById('assignBadgeSelect').value;

  if (!userIdentifier || !badgeName) return alert('Select user and badge');

  const user = users.find(u => (u.username || u.email) === userIdentifier);
  const badge = badges.find(b => b.name === badgeName);
  if (!user || !badge) return;

  try {
    await api.assignBadge(user.username || user.email, badge.name);

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

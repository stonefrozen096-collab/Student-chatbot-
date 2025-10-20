// ---------- Badge Management (API Version) ----------

let badges = [];
let users = [];

// ---------- LOAD DATA ----------
async function loadBadgeData() {
  try {
    badges = await getBadges(); // API call from api.js
    users = await getUsers();   // API call from api.js
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

  const accessInput = prompt('Enter special access for this badge (comma-separated):', '');
  const access = accessInput ? accessInput.split(',').map(a => a.trim()) : [];

  if (!name) return alert('Enter badge name');

  try {
    const newBadge = await createBadge(name, effects, access); // API call
    badges.push(newBadge);
    renderBadges();
    document.getElementById('addBadgeForm').reset();
    showBadgeStatus(`✅ Badge "${name}" created successfully!`);
    updateAssignBadgeSelect();
  } catch (err) {
    console.error('Error creating badge:', err);
    alert('Failed to create badge!');
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

  badges.forEach((b, i) => {
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
    await removeBadge(id); // API call
    badges = badges.filter(b => b.id !== id);
    renderBadges();
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
    await assignBadge(user.username, badge.name); // API call
    // Update local copy for UI
    if (!user.badges) user.badges = [];
    if (!user.badges.includes(badgeName)) user.badges.push(badgeName);

    user.specialAccess = [...new Set([...(user.specialAccess || []), ...badge.access])];

    showBadgeStatus(`✅ Badge "${badgeName}" assigned to ${user.name}`);
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

// ---------- INITIALIZE ----------
document.addEventListener('DOMContentLoaded', loadBadgeData);

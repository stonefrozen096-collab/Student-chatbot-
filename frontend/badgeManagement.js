// ---------- Badge Management (JSON Version) ----------

let badges = [];       // Load from badges.json
let users = [];        // Load from users.json

// ---------- FETCH JSON ----------
async function loadBadgeData() {
  try {
    const resBadges = await fetch('data/badges.json');
    badges = await resBadges.json();
  } catch(e) {
    console.error('Failed to load badges.json', e);
    badges = [];
  }

  try {
    const resUsers = await fetch('data/users.json');
    users = await resUsers.json();
  } catch(e) {
    console.error('Failed to load users.json', e);
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

  // Dynamic special access input
  const accessInput = prompt('Enter special access for this badge (comma-separated):', '');
  const access = accessInput ? accessInput.split(',').map(a => a.trim()) : [];

  if (!name) return alert('Enter badge name');

  badges.push({ name, effects, access });
  await saveBadgesJSON();
  renderBadges();
  e.target.reset();

  showBadgeStatus(`✅ Badge "${name}" created successfully!`);
});

// ---------- RENDER BADGES ----------
function renderBadges() {
  const div = document.getElementById('badgeList');
  div.innerHTML = '';
  if (badges.length === 0) {
    div.innerHTML = '<div class="placeholder">No badges yet.</div>';
    return;
  }

  badges.forEach((b, i) => {
    const d = document.createElement('div');
    d.className = 'badgeItem';
    d.innerHTML = `
      <span class="${b.effects.join(' ')}">${b.name}</span>
      [Effects: ${b.effects.join(', ')} | Access: ${b.access.join(', ')}]
      <button onclick="deleteBadge(${i})">🗑️ Delete</button>
    `;
    div.appendChild(d);
  });
  updateAssignBadgeSelect();
}

// ---------- DELETE BADGE ----------
function deleteBadge(index) {
  if (!confirm('Delete this badge?')) return;
  badges.splice(index, 1);
  saveBadgesJSON().then(renderBadges);
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

  if (!user.badges) user.badges = [];
  if (!user.badges.includes(badgeName)) user.badges.push(badgeName);

  // Assign dynamic access from badge
  user.specialAccess = [...new Set([...(user.specialAccess || []), ...badge.access])];

  await saveUsersJSON();
  showBadgeStatus(`✅ Badge "${badgeName}" assigned to ${user.name}`);
});

// ---------- STATUS ANIMATION ----------
function showBadgeStatus(msg) {
  const status = document.getElementById('badgeStatus');
  status.innerText = msg;
  status.classList.add('badgeAnimation');
  setTimeout(() => status.classList.remove('badgeAnimation'), 2000);
}

// ---------- SAVE JSON ----------
async function saveBadgesJSON() {
  // Replace this with your server API
  console.log('Badges JSON saved. Replace with API POST call.');
}

async function saveUsersJSON() {
  // Replace this with your server API
  console.log('Users JSON saved. Replace with API POST call.');
}

// ---------- INITIALIZE ----------
document.addEventListener('DOMContentLoaded', loadBadgeData);

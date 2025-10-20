// ---------- User Management ----------
let users = [];       // Will be fetched from users.json
let badges = [];      // Will be fetched from badges.json
let specialAccess = {}; // { username: [permissions] }

// 🔹 Fetch JSON data from server (replace paths as needed)
async function fetchUsers() {
  const res = await fetch('data/Users.json');
  users = await res.json();
  renderUsers();
}

async function fetchBadges() {
  const res = await fetch('data/Badges.json');
  badges = await res.json();
}

// 🔹 Save users to JSON (example uses fetch POST, adapt to your backend)
async function saveUsers() {
  await fetch('api/saveUsers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(users)
  });
}

// 🎯 Render Users Table
function renderUsers() {
  const tbody = document.querySelector('#userTable tbody');
  tbody.innerHTML = '';

  users.forEach((user, index) => {
    const userBadges = (user.badges || []).join(', ') || 'None';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${user.locked ? '🔒 Locked' : '✅ Active'}</td>
      <td>${userBadges}</td>
      <td>
        <button onclick="editUser(${index})">✏️ Edit</button>
        <button onclick="deleteUser(${index})">🗑️ Delete</button>
        <button onclick="toggleLock(${index})">${user.locked ? '🔓 Unlock' : '🔒 Lock'}</button>
        <button onclick="assignBadgeUI(${index})">🏅 Assign Badge</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ➕ Add User
document.getElementById('addUserForm').addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const role = document.getElementById('role').value;

  if (!username || !email) return showNotification('All fields are required', 'error');

  const newUser = { username, email, role, locked: false, badges: [] };
  users.push(newUser);
  await saveUsers();

  e.target.reset();
  renderUsers();
  showNotification('User added successfully!', 'success');
});

// ✏️ Edit User
function editUser(index) {
  const user = users[index];
  const newRole = prompt(`Edit role for ${user.username}:`, user.role);
  if (newRole) {
    user.role = newRole;
    saveUsers().then(renderUsers);
    showNotification(`Role updated for ${user.username}`, 'success');
  }
}

// 🗑️ Delete User
function deleteUser(index) {
  if (confirm(`Delete user ${users[index].username}?`)) {
    users.splice(index, 1);
    saveUsers().then(renderUsers);
    showNotification(`User ${users[index]?.username || ''} deleted`, 'success');
  }
}

// 🔒 Lock / Unlock User
function toggleLock(index) {
  users[index].locked = !users[index].locked;
  saveUsers().then(renderUsers);
  const status = users[index].locked ? 'locked' : 'unlocked';
  showNotification(`User ${users[index].username} ${status}`, 'info');
}

// 🏅 Assign Badge UI
function assignBadgeUI(index) {
  const badgeName = prompt(`Enter badge name to assign to ${users[index].username}:\nAvailable badges: ${badges.map(b=>b.name).join(', ')}`);
  if (!badgeName) return;
  const badgeExists = badges.find(b => b.name === badgeName);
  if (!badgeExists) return showNotification('Badge does not exist!', 'error');

  users[index].badges = users[index].badges || [];
  if (!users[index].badges.includes(badgeName)) {
    users[index].badges.push(badgeName);
    saveUsers().then(renderUsers);
    showNotification(`Badge "${badgeName}" assigned to ${users[index].username}`, 'success');
  } else {
    showNotification(`${users[index].username} already has this badge`, 'info');
  }
}

// 🔔 Animated Notifications
function showNotification(message, type = 'info') {
  const banner = document.createElement('div');
  banner.className = `notification ${type}`;
  banner.innerText = message;
  document.body.appendChild(banner);

  banner.animate([
    { transform: 'translateY(-50px)', opacity: 0 },
    { transform: 'translateY(0)', opacity: 1 }
  ], { duration: 400 });

  setTimeout(() => {
    banner.animate([
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(-50px)', opacity: 0 }
    ], { duration: 400 }).onfinish = () => banner.remove();
  }, 3000);
}

// 🔄 Initialize
document.addEventListener('DOMContentLoaded', () => {
  fetchUsers();
  fetchBadges();
});

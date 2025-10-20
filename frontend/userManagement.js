// ---------- User Management (JSON-based) ----------
let users = []; // Fetched from JSON
const rolesWithPassword = ['faculty', 'moderator', 'tester'];

// 🔹 Fetch users from JSON
async function fetchUsers() {
  try {
    const res = await fetch('data/users.json');
    if (!res.ok) throw 'Failed to fetch users.json';
    users = await res.json();
    renderUsers();
  } catch (err) {
    console.error(err);
    const tbody = document.querySelector('#userTable tbody');
    tbody.innerHTML = '<tr><td colspan="6">Error loading users.</td></tr>';
  }
}

// 🔹 Save users to JSON (adapt to your backend API)
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

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6">No users found.</td></tr>';
    return;
  }

  users.forEach((user, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${rolesWithPassword.includes(user.role) ? '●●●●●' : '-'}</td>
      <td>${user.locked ? '🔒 Locked' : '✅ Active'}</td>
      <td>
        <button onclick="editUser(${index})">✏️ Edit</button>
        <button onclick="deleteUser(${index})">🗑️ Delete</button>
        <button onclick="toggleLock(${index})">${user.locked ? '🔓 Unlock' : '🔒 Lock'}</button>
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
  const password = rolesWithPassword.includes(role) ? document.getElementById('password').value.trim() : '';

  if (!username || !email || (rolesWithPassword.includes(role) && !password))
    return showNotification('All required fields must be filled', 'error');

  const newUser = { username, email, role, password: password || '', locked: false };
  users.push(newUser);
  await saveUsers();

  e.target.reset();
  renderUsers();
  showNotification('User added successfully!', 'success');
});

// ✏️ Edit User
function editUser(index) {
  const user = users[index];
  const newEmail = prompt(`Edit email for ${user.username}:`, user.email);
  let newPassword = '';
  if (rolesWithPassword.includes(user.role)) {
    newPassword = prompt(`Edit password for ${user.username}:`, user.password || '');
  }

  if (newEmail) user.email = newEmail;
  if (rolesWithPassword.includes(user.role) && newPassword) user.password = newPassword;

  saveUsers().then(renderUsers);
  showNotification(`User ${user.username} updated`, 'success');
}

// 🗑️ Delete User
function deleteUser(index) {
  if (confirm(`Delete user ${users[index].username}?`)) {
    const deletedUser = users.splice(index, 1)[0];
    saveUsers().then(renderUsers);
    showNotification(`User ${deletedUser.username} deleted`, 'success');
  }
}

// 🔒 Lock / Unlock User
function toggleLock(index) {
  users[index].locked = !users[index].locked;
  saveUsers().then(renderUsers);
  const status = users[index].locked ? 'locked' : 'unlocked';
  showNotification(`User ${users[index].username} ${status}`, 'info');
}

// 🔔 Notifications
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

// 🔎 Search Filter
document.getElementById('profileSearch').addEventListener('input', e => {
  const query = e.target.value.toLowerCase();
  const filtered = users.filter(u =>
    (u.username || '').toLowerCase().includes(query) ||
    (u.email || '').toLowerCase().includes(query) ||
    (u.role || '').toLowerCase().includes(query)
  );
  renderFilteredUsers(filtered);
});

function renderFilteredUsers(list) {
  const tbody = document.querySelector('#userTable tbody');
  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6">No users found.</td></tr>';
    return;
  }

  list.forEach((user, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${rolesWithPassword.includes(user.role) ? '●●●●●' : '-'}</td>
      <td>${user.locked ? '🔒 Locked' : '✅ Active'}</td>
      <td>
        <button onclick="editUser(${index})">✏️ Edit</button>
        <button onclick="deleteUser(${index})">🗑️ Delete</button>
        <button onclick="toggleLock(${index})">${user.locked ? '🔓 Unlock' : '🔒 Lock'}</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// 🔄 Initialize
document.addEventListener('DOMContentLoaded', fetchUsers);

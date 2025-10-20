// ---------- User Management (API Integrated) ----------
let users = [];
const rolesWithPassword = ['faculty', 'moderator', 'tester'];

// 🔹 Fetch users from API
async function fetchUsers() {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    users = await res.json();
    renderUsers();
  } catch (err) {
    console.error(err);
    const tbody = document.querySelector('#userTable tbody');
    tbody.innerHTML = '<tr><td colspan="6">Error loading users.</td></tr>';
  }
}

// 🔹 Save users via API
async function saveUsers() {
  try {
    const res = await fetch('/api/users/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users)
    });
    if (!res.ok) throw new Error('Failed to save users');
  } catch (err) {
    console.error('Error saving users:', err);
    showNotification('Error saving users', 'error');
  }
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

  try {
    const res = await fetch('/api/users/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    if (!res.ok) throw new Error('Failed to add user');
    users.push(newUser);
    renderUsers();
    e.target.reset();
    showNotification('User added successfully!', 'success');
  } catch (err) {
    console.error(err);
    showNotification('Error adding user', 'error');
  }
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

  fetch('/api/users/update', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  })
    .then(res => res.ok ? renderUsers() : showNotification('Update failed', 'error'))
    .then(() => showNotification(`User ${user.username} updated`, 'success'))
    .catch(() => showNotification('Error updating user', 'error'));
}

// 🗑️ Delete User
function deleteUser(index) {
  if (confirm(`Delete user ${users[index].username}?`)) {
    const deletedUser = users[index];
    fetch(`/api/users/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: deletedUser.email })
    })
      .then(res => {
        if (!res.ok) throw new Error('Delete failed');
        users.splice(index, 1);
        renderUsers();
        showNotification(`User ${deletedUser.username} deleted`, 'success');
      })
      .catch(() => showNotification('Error deleting user', 'error'));
  }
}

// 🔒 Lock / Unlock User
function toggleLock(index) {
  const user = users[index];
  user.locked = !user.locked;
  fetch('/api/users/lock-toggle', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, locked: user.locked })
  })
    .then(res => {
      if (!res.ok) throw new Error('Toggle lock failed');
      renderUsers();
      showNotification(`User ${user.username} ${user.locked ? 'locked' : 'unlocked'}`, 'info');
    })
    .catch(() => showNotification('Error changing lock status', 'error'));
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

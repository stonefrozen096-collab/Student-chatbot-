// ----------------------
// User Management — Updated to Use api.js
// ----------------------

import { getUsers, addUser, editUser, deleteUser, toggleUserLock } from './api.js';

let users = [];
const rolesWithPassword = ['faculty', 'moderator', 'tester'];

// ----------------------
// Socket.IO Setup
// ----------------------
const socket = io();

socket.on('user-updated', updatedUser => {
  const idx = users.findIndex(u => u.email === updatedUser.email);
  if (idx !== -1) {
    users[idx] = updatedUser;
    renderUsers();
  }
});

socket.on('user-added', newUser => {
  users.push(newUser);
  renderUsers();
});

socket.on('user-deleted', email => {
  users = users.filter(u => u.email !== email);
  renderUsers();
});

// ----------------------
// Fetch Users
// ----------------------
async function fetchAndRenderUsers() {
  const res = await getUsers();
  if (!res.error) {
    users = res;
    renderUsers();
  } else {
    document.querySelector('#userTable tbody').innerHTML =
      '<tr><td colspan="6">Error loading users.</td></tr>';
  }
}

// ----------------------
// Render Users
// ----------------------
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
        <button onclick="editUserHandler(${index})">✏️ Edit</button>
        <button onclick="deleteUserHandler(${index})">🗑️ Delete</button>
        <button onclick="toggleLockHandler(${index})">${user.locked ? '🔓 Unlock' : '🔒 Lock'}</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ----------------------
// Add User
// ----------------------
document.getElementById('addUserForm').addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const role = document.getElementById('role').value;
  const password = rolesWithPassword.includes(role) ? document.getElementById('password').value.trim() : '';

  if (!username || !email || (rolesWithPassword.includes(role) && !password)) {
    return showNotification('All required fields must be filled', 'error');
  }

  const newUser = { username, email, role, password: password || '', locked: false };

  const res = await addUser(newUser);
  if (!res.error) {
    socket.emit('add-user', res); // broadcast
    e.target.reset();
    showNotification('User added successfully!', 'success');
    fetchAndRenderUsers();
  }
});

// ----------------------
// Edit User
// ----------------------
window.editUserHandler = async function(index) {
  const user = users[index];
  const newEmail = prompt(`Edit email for ${user.username}:`, user.email);
  let newPassword = '';
  if (rolesWithPassword.includes(user.role)) {
    newPassword = prompt(`Edit password for ${user.username}:`, user.password || '');
  }

  if (newEmail) user.email = newEmail;
  if (rolesWithPassword.includes(user.role) && newPassword) user.password = newPassword;

  const res = await editUser(user.email, user);
  if (!res.error) {
    socket.emit('update-user', user);
    showNotification(`User ${user.username} updated`, 'success');
    fetchAndRenderUsers();
  }
};

// ----------------------
// Delete User
// ----------------------
window.deleteUserHandler = async function(index) {
  const user = users[index];
  if (!confirm(`Delete user ${user.username}?`)) return;

  const res = await deleteUser(user.email);
  if (!res.error) {
    socket.emit('delete-user', user.email);
    showNotification(`User ${user.username} deleted`, 'success');
    fetchAndRenderUsers();
  }
};

// ----------------------
// Lock/Unlock User
// ----------------------
window.toggleLockHandler = async function(index) {
  const user = users[index];
  const res = await toggleUserLock(user.email, !user.locked);
  if (!res.error) {
    user.locked = !user.locked;
    socket.emit('update-user', user);
    fetchAndRenderUsers();
  }
};

// ----------------------
// Search Filter
// ----------------------
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
        <button onclick="editUserHandler(${index})">✏️ Edit</button>
        <button onclick="deleteUserHandler(${index})">🗑️ Delete</button>
        <button onclick="toggleLockHandler(${index})">${user.locked ? '🔓 Unlock' : '🔒 Lock'}</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ----------------------
// Notifications
// ----------------------
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

// ----------------------
// Initialize
// ----------------------
document.addEventListener('DOMContentLoaded', fetchAndRenderUsers);

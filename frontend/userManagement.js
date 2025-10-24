// ----------------------
// user-management.js — Fully Updated & Compatible with api.js
// ----------------------
import { getUsers, addUser, editUser, deleteUser, toggleUserLock } from './api.js';

let users = [];
const rolesWithPassword = ['faculty', 'moderator', 'tester'];
const socket = io(); // Socket.IO

// ----------------------
// Socket.IO Events
// ----------------------
socket.on('user-added', newUser => {
  users.push(newUser);
  renderUsers();
});

socket.on('user-updated', updatedUser => {
  const idx = users.findIndex(u => u.email === updatedUser.email);
  if (idx !== -1) {
    users[idx] = updatedUser;
    renderUsers();
  }
});

socket.on('user-deleted', email => {
  users = users.filter(u => u.email !== email);
  renderUsers();
});

// ----------------------
// Fetch & Render Users
// ----------------------
async function fetchAndRenderUsers() {
  const data = await getUsers();
  if (!data.error) users = data;
  renderUsers();
}

function renderUsers(list = users) {
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
// Add User
// ----------------------
document.getElementById('addUserForm').addEventListener('submit', async e => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const role = document.getElementById('role').value;
  const password = rolesWithPassword.includes(role)
    ? document.getElementById('password').value.trim()
    : '';

  if (!username || !email || (rolesWithPassword.includes(role) && !password)) {
    return showNotification('All required fields must be filled', 'error');
  }

  const newUser = { username, email, role, password: password || '', locked: false };
  const result = await addUser(newUser);

  if (!result.error) {
    users.push(result);
    renderUsers();
    socket.emit('user-added', result);
    showNotification('User added successfully!', 'success');
    e.target.reset();
  } else {
    showNotification('Error adding user', 'error');
  }
});

// ----------------------
// Edit User
// ----------------------
window.editUserHandler = async function (index) {
  const user = users[index];
  const newEmail = prompt(`Edit email for ${user.username}:`, user.email);
  let newPassword = '';
  if (rolesWithPassword.includes(user.role)) {
    newPassword = prompt(`Edit password for ${user.username}:`, user.password || '');
  }

  if (!newEmail) return;

  const updates = { ...user, email: newEmail };
  if (rolesWithPassword.includes(user.role) && newPassword) updates.password = newPassword;

  const result = await editUser(user.email, updates);
  if (!result.error) {
    users[index] = result;
    renderUsers();
    socket.emit('user-updated', result);
    showNotification(`User ${user.username} updated`, 'success');
  } else {
    showNotification('Error updating user', 'error');
  }
};

// ----------------------
// Delete User
// ----------------------
window.deleteUserHandler = async function (index) {
  const user = users[index];
  if (!confirm(`Delete user ${user.username}?`)) return;

  const result = await deleteUser(user.email);
  if (!result.error) {
    users.splice(index, 1);
    renderUsers();
    socket.emit('user-deleted', user.email);
    showNotification(`User ${user.username} deleted`, 'success');
  } else {
    showNotification('Error deleting user', 'error');
  }
};

// ----------------------
// Lock / Unlock User
// ----------------------
window.toggleLockHandler = async function (index) {
  const user = users[index];
  const result = await toggleUserLock(user.email, !user.locked);

  if (!result.error) {
    user.locked = !user.locked;
    renderUsers();
    showNotification(`User ${user.username} ${user.locked ? 'locked' : 'unlocked'}`, 'info');
  }
};

// ----------------------
// Search / Filter
// ----------------------
document.getElementById('profileSearch').addEventListener('input', e => {
  const query = e.target.value.toLowerCase();
  const filtered = users.filter(u =>
    (u.username || '').toLowerCase().includes(query) ||
    (u.email || '').toLowerCase().includes(query) ||
    (u.role || '').toLowerCase().includes(query)
  );
  renderUsers(filtered);
});

// ----------------------
// Notification Helper
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

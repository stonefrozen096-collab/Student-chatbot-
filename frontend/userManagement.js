// ---------- User Management (API + Socket.IO Version) ----------
import * as api from './api.js';

let users = [];
const rolesWithPassword = ['faculty', 'moderator', 'tester'];
const socket = io();

// ---------- SOCKET.IO EVENTS ----------
socket.on('users:created', newUser => { users.push(newUser); renderUsers(); });
socket.on('users:updated', updatedUser => {
  const idx = users.findIndex(u => u.email === updatedUser.email);
  if (idx !== -1) { users[idx] = updatedUser; renderUsers(); }
});
socket.on('users:deleted', ({ email }) => {
  users = users.filter(u => u.email !== email);
  renderUsers();
});
socket.on('users:lock', ({ email, locked }) => {
  const user = users.find(u => u.email === email);
  if (user) { user.locked = locked; renderUsers(); }
});

// ---------- FETCH & RENDER ----------
async function fetchAndRenderUsers() {
  try { users = await api.getUsers(); } 
  catch { users = []; }
  renderUsers();
}

function renderUsers(list = users) {
  const tbody = document.querySelector('#userTable tbody');
  tbody.innerHTML = '';
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="6">No users found.</td></tr>'; return; }

  list.forEach((user, idx) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${rolesWithPassword.includes(user.role) ? '●●●●●' : '-'}</td>
      <td>${user.locked ? '🔒 Locked' : '✅ Active'}</td>
      <td>
        <button type="button" onclick="editUserHandler(${idx})">✏️ Edit</button>
        <button type="button" onclick="deleteUserHandler(${idx})">🗑️ Delete</button>
        <button type="button" onclick="toggleLockHandler(${idx})">${user.locked ? '🔓 Unlock' : '🔒 Lock'}</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ---------- ADD USER ----------
document.getElementById('addUserForm').addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const role = document.getElementById('role').value;
  const password = rolesWithPassword.includes(role) ? document.getElementById('password').value.trim() : '';

  if (!username || !email || (rolesWithPassword.includes(role) && !password)) return showNotification('All required fields must be filled', 'error');

  try {
    const newUser = await api.addUser({ username, email, role, password: password || '', locked: false });
    users.push(newUser);
    renderUsers();
    showNotification('User added successfully!', 'success');
    document.getElementById('addUserForm').reset();
    socket.emit('users:created', newUser);
  } catch {
    showNotification('Error adding user', 'error');
  }
});

// ---------- EDIT USER ----------
window.editUserHandler = async (index) => {
  const user = users[index];
  const newEmail = prompt(`Edit email for ${user.username}:`, user.email);
  if (!newEmail) return;

  let newPassword = '';
  if (rolesWithPassword.includes(user.role)) {
    newPassword = prompt(`Edit password for ${user.username}:`, user.password || '');
  }

  try {
    const updates = { ...user, email: newEmail };
    if (rolesWithPassword.includes(user.role) && newPassword) updates.password = newPassword;
    const updatedUser = await api.editUser(user.email, updates);
    users[index] = updatedUser;
    renderUsers();
    showNotification(`User ${user.username} updated`, 'success');
    socket.emit('users:updated', updatedUser);
  } catch {
    showNotification('Error updating user', 'error');
  }
};

// ---------- DELETE USER ----------
window.deleteUserHandler = async (index) => {
  const user = users[index];
  if (!confirm(`Delete user ${user.username}?`)) return;

  try {
    await api.deleteUser(user.email);
    users.splice(index, 1);
    renderUsers();
    showNotification(`User ${user.username} deleted`, 'success');
    socket.emit('users:deleted', { email: user.email });
  } catch {
    showNotification('Error deleting user', 'error');
  }
};

// ---------- LOCK / UNLOCK USER ----------
window.toggleLockHandler = async (index) => {
  const user = users[index];
  try {
    await api.toggleUserLock(user.email, !user.locked);
    user.locked = !user.locked;
    renderUsers();
    showNotification(`User ${user.username} ${user.locked ? 'locked' : 'unlocked'}`, 'info');
  } catch {
    showNotification('Failed to toggle lock', 'error');
  }
};

// ---------- SEARCH ----------
document.getElementById('profileSearch').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = users.filter(u =>
    (u.username || '').toLowerCase().includes(query) ||
    (u.email || '').toLowerCase().includes(query) ||
    (u.role || '').toLowerCase().includes(query)
  );
  renderUsers(filtered);
});

// ---------- NOTIFICATION ----------
function showNotification(msg, type='info') {
  const banner = document.createElement('div');
  banner.className = `notification ${type}`;
  banner.innerText = msg;
  document.body.appendChild(banner);

  banner.animate([{ transform: 'translateY(-50px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 400 });

  setTimeout(() => {
    banner.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-50px)', opacity: 0 }], { duration: 400 }).onfinish = () => banner.remove();
  }, 3000);
}

// ---------- INITIALIZE ----------
document.addEventListener('DOMContentLoaded', fetchAndRenderUsers);

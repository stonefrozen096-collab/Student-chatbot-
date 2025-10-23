// ---------- User Management (Local + Socket.IO + Multi-tab Sync) ----------
let users = JSON.parse(localStorage.getItem('users')) || [];
const rolesWithPassword = ['faculty', 'moderator', 'tester'];

// ---------- Socket.IO (Optional, fallback if no server) ----------
let socket;
try {
  socket = io(); // real connection if available
} catch {
  socket = { on: () => {}, emit: () => {} }; // dummy
}

// ---------- Save Users ----------
function saveUsers() {
  localStorage.setItem('users', JSON.stringify(users));
}

// ---------- Sync Across Tabs ----------
window.addEventListener('storage', (event) => {
  if (event.key === 'users') {
    users = JSON.parse(event.newValue) || [];
    renderUsers();
  }
});

// ---------- Render Users ----------
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

// ---------- Add User ----------
document.getElementById('addUserForm').addEventListener('submit', e => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const role = document.getElementById('role').value;
  const password = rolesWithPassword.includes(role)
    ? document.getElementById('password').value.trim()
    : '';

  if (!username || !email || (rolesWithPassword.includes(role) && !password))
    return showNotification('⚠️ Fill all required fields', 'error');

  if (users.some(u => u.email === email))
    return showNotification('⚠️ User already exists', 'error');

  const newUser = { username, email, role, password, locked: false };
  users.push(newUser);
  saveUsers();
  renderUsers();
  socket.emit('add-user', newUser);
  e.target.reset();
  showNotification('✅ User added successfully!', 'success');
});

// ---------- Edit User ----------
function editUser(index) {
  const user = users[index];
  const newEmail = prompt(`Edit email for ${user.username}:`, user.email);
  if (!newEmail) return;

  let newPassword = user.password;
  if (rolesWithPassword.includes(user.role)) {
    newPassword = prompt(`Edit password for ${user.username}:`, user.password || '');
  }

  user.email = newEmail;
  if (rolesWithPassword.includes(user.role)) user.password = newPassword;

  users[index] = user;
  saveUsers();
  socket.emit('update-user', user);
  renderUsers();
  showNotification(`✏️ User ${user.username} updated`, 'success');
}

// ---------- Delete User ----------
function deleteUser(index) {
  const user = users[index];
  if (!confirm(`🗑️ Delete user ${user.username}?`)) return;
  users.splice(index, 1);
  saveUsers();
  renderUsers();
  socket.emit('delete-user', user.email);
  showNotification(`✅ User ${user.username} deleted`, 'info');
}

// ---------- Lock/Unlock ----------
function toggleLock(index) {
  const user = users[index];
  user.locked = !user.locked;
  users[index] = user;
  saveUsers();
  renderUsers();
  socket.emit('update-user', user);
  showNotification(
    `🔐 User ${user.username} ${user.locked ? 'locked' : 'unlocked'}`,
    'info'
  );
}

// ---------- Notifications ----------
function showNotification(message, type = 'info') {
  const banner = document.createElement('div');
  banner.className = `notification ${type}`;
  banner.innerText = message;
  document.body.appendChild(banner);

  banner.animate(
    [{ transform: 'translateY(-50px)', opacity: 0 },
     { transform: 'translateY(0)', opacity: 1 }],
    { duration: 400 }
  );

  setTimeout(() => {
    banner.animate(
      [{ transform: 'translateY(0)', opacity: 1 },
       { transform: 'translateY(-50px)', opacity: 0 }],
      { duration: 400 }
    ).onfinish = () => banner.remove();
  }, 3000);
}

// ---------- Search Filter ----------
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

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', renderUsers);

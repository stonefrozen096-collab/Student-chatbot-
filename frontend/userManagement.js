// ----- User Management -----
let users = JSON.parse(localStorage.getItem('users') || '[]');

// 🎯 Render Users Table
function renderUsers() {
  const tbody = document.querySelector('#userTable tbody');
  tbody.innerHTML = '';

  users.forEach((user, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
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
document.getElementById('addUserForm').addEventListener('submit', e => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const role = document.getElementById('role').value;

  if (!username || !email) return alert('All fields are required.');

  const newUser = { username, email, role, locked: false, badges: [] };
  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));

  e.target.reset();
  renderUsers();
  alert('✅ User added successfully!');
});

// ✏️ Edit User
function editUser(index) {
  const user = users[index];
  const newRole = prompt(`Edit role for ${user.username}:`, user.role);
  if (newRole) {
    user.role = newRole;
    localStorage.setItem('users', JSON.stringify(users));
    renderUsers();
  }
}

// 🗑️ Delete User
function deleteUser(index) {
  if (confirm(`Delete user ${users[index].username}?`)) {
    users.splice(index, 1);
    localStorage.setItem('users', JSON.stringify(users));
    renderUsers();
  }
}

// 🔒 Lock / Unlock User
function toggleLock(index) {
  users[index].locked = !users[index].locked;
  localStorage.setItem('users', JSON.stringify(users));
  renderUsers();
}

// 🔄 Initialize
document.addEventListener('DOMContentLoaded', renderUsers);

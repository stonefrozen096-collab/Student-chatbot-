let users = [];

// ===== Load users from JSON =====
async function loadUsers() {
  try {
    const res = await fetch('data/users.json'); // path to your JSON file
    if (!res.ok) throw 'Failed to fetch users.json';
    users = await res.json();
    renderProfiles(users);
  } catch (err) {
    console.error(err);
    const tbody = document.querySelector('#profileTable tbody');
    tbody.innerHTML = '<tr><td colspan="9">Error loading users.</td></tr>';
  }
}

// ===== Render Profiles =====
function renderProfiles(list = users) {
  const tbody = document.querySelector('#profileTable tbody');
  tbody.innerHTML = '';

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="9">No users found.</td></tr>';
    return;
  }

  list.forEach((user, index) => {
    const profilePic = user.profilePic || 'default-avatar.png';
    const badgeHtml = (user.badges || []).map(b => `<span class="badge">${b}</span>`).join(' ');
    const accessHtml = (user.specialAccess || []).join(', ');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${profilePic}" alt="avatar" class="profileAvatar"></td>
      <td>${user.username}</td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>${badgeHtml}</td>
      <td>${accessHtml}</td>
      <td>${user.locked ? '🔒 Locked' : '✅ Active'}</td>
      <td>
        <button onclick="editUserProfile(${index}, this)">✏️ Edit</button>
        <button onclick="deleteUser(${index}, this)">🗑️ Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ===== Search Filter =====
document.getElementById('profileSearch').addEventListener('input', e => {
  const query = e.target.value.toLowerCase();
  const filtered = users.filter(u =>
    (u.username || '').toLowerCase().includes(query) ||
    (u.name || '').toLowerCase().includes(query) ||
    (u.email || '').toLowerCase().includes(query)
  );
  renderProfiles(filtered);
});

// ===== Edit Profile =====
function editUserProfile(index, btn) {
  const user = users[index];
  const newName = prompt('Edit Name:', user.name);
  const newEmail = prompt('Edit Email:', user.email);
  const newPic = prompt('Profile Picture URL:', user.profilePic || '');

  if (newName) user.name = newName;
  if (newEmail) user.email = newEmail;
  if (newPic) user.profilePic = newPic;

  showNotification('✅ Profile updated (requires server save).');

  const row = btn.closest('tr');
  row.classList.add('updated');
  setTimeout(() => row.classList.remove('updated'), 1200);

  renderProfiles();
}

// ===== Delete User =====
function deleteUser(index, btn) {
  if (confirm(`Delete user ${users[index].username}?`)) {
    users.splice(index, 1);

    showNotification('🗑️ User deleted (requires server save).');

    const row = btn.closest('tr');
    row.classList.add('updated');
    setTimeout(() => row.classList.remove('updated'), 1200);

    renderProfiles();
  }
}

// ===== Floating Notification =====
function showNotification(msg) {
  const notif = document.createElement('div');
  notif.className = 'floatingNotification';
  notif.innerText = msg;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', loadUsers);

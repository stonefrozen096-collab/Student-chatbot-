// ---------- Profile Management (API Version) ----------
let users = [];

// ---------- Fetch Users from API ----------
async function loadUsers() {
  try {
    users = await fetchUsers(); // API: returns all users
    renderProfiles(users);
  } catch (err) {
    console.error('Failed to fetch users from API', err);
    const tbody = document.querySelector('#profileTable tbody');
    tbody.innerHTML = '<tr><td colspan="9">Error loading users.</td></tr>';
  }
}

// ---------- Render Profiles ----------
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
      <td>${badgeHtml || 'None'}</td>
      <td>${accessHtml || 'None'}</td>
      <td>${user.locked ? '🔒 Locked' : '✅ Active'}</td>
      <td>
        <button onclick="editUserProfileAPI('${user.id}')">✏️ Edit</button>
        <button onclick="deleteUserAPI('${user.id}')">🗑️ Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------- Search Filter ----------
document.getElementById('profileSearch').addEventListener('input', e => {
  const query = e.target.value.toLowerCase();
  const filtered = users.filter(u =>
    (u.username || '').toLowerCase().includes(query) ||
    (u.name || '').toLowerCase().includes(query) ||
    (u.email || '').toLowerCase().includes(query)
  );
  renderProfiles(filtered);
});

// ---------- Edit Profile ----------
async function editUserProfileAPI(id) {
  const user = users.find(u => u.id === id);
  if (!user) return alert('User not found');

  const newName = prompt('Edit Name:', user.name);
  const newEmail = prompt('Edit Email:', user.email);
  const newPic = prompt('Profile Picture URL:', user.profilePic || '');

  if (newName) user.name = newName;
  if (newEmail) user.email = newEmail;
  if (newPic) user.profilePic = newPic;

  try {
    const updatedUser = await updateUser(id, user); // API call
    const idx = users.findIndex(u => u.id === id);
    users[idx] = updatedUser;
    renderProfiles();
    showNotification('✅ Profile updated.');
  } catch (err) {
    console.error('Failed to update user', err);
    alert('Failed to update profile!');
  }
}

// ---------- Delete User ----------
async function deleteUserAPI(id) {
  if (!confirm('Delete this user?')) return;
  try {
    await deleteUser(id); // API call
    users = users.filter(u => u.id !== id);
    renderProfiles();
    showNotification('🗑️ User deleted.');
  } catch (err) {
    console.error('Failed to delete user', err);
    alert('Failed to delete user!');
  }
}

// ---------- Floating Notification ----------
function showNotification(msg) {
  const notif = document.createElement('div');
  notif.className = 'floatingNotification';
  notif.innerText = msg;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', loadUsers);

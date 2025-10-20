let users = JSON.parse(localStorage.getItem('users') || '[]');

// Render Profiles
function renderProfiles() {
  const tbody = document.querySelector('#profileTable tbody');
  tbody.innerHTML = '';

  users.forEach((user, index) => {
    const tr = document.createElement('tr');

    // Profile picture (default if not set)
    const profilePic = user.profilePic || 'default-avatar.png'; // provide a default avatar

    // Badges display
    const badgeHtml = (user.badges || []).map(b => `<span class="badge">${b}</span>`).join(' ');

    // Special access
    const accessHtml = (user.specialAccess || []).join(', ');

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
        <button onclick="editUserProfile(${index})">✏️ Edit</button>
        <button onclick="deleteUser(${index})">🗑️ Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Search Filter
document.getElementById('profileSearch').addEventListener('input', e => {
  const query = e.target.value.toLowerCase();
  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(query) ||
    u.name.toLowerCase().includes(query) ||
    u.email.toLowerCase().includes(query)
  );
  renderProfilesFiltered(filtered);
});

function renderProfilesFiltered(list) {
  const tbody = document.querySelector('#profileTable tbody');
  tbody.innerHTML = '';

  list.forEach((user, index) => {
    const tr = document.createElement('tr');
    const profilePic = user.profilePic || 'default-avatar.png';
    const badgeHtml = (user.badges || []).map(b => `<span class="badge">${b}</span>`).join(' ');
    const accessHtml = (user.specialAccess || []).join(', ');

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
        <button onclick="editUserProfile(${index})">✏️ Edit</button>
        <button onclick="deleteUser(${index})">🗑️ Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Edit Profile including profile picture
function editUserProfile(index) {
  const user = users[index];
  const newName = prompt('Edit Name:', user.name);
  const newEmail = prompt('Edit Email:', user.email);
  const newPic = prompt('Profile Picture URL:', user.profilePic || '');

  if (newName) user.name = newName;
  if (newEmail) user.email = newEmail;
  if (newPic) user.profilePic = newPic;

  localStorage.setItem('users', JSON.stringify(users));
  renderProfiles();
}

// Delete User
function deleteUser(index) {
  if(confirm(`Delete user ${users[index].username}?`)) {
    users.splice(index,1);
    localStorage.setItem('users', JSON.stringify(users));
    renderProfiles();
  }
}

// Initial render
document.addEventListener('DOMContentLoaded', renderProfiles);

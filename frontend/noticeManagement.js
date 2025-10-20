// ---------- Notice Management (API Version) ----------
let notices = [];  // Fetched from server via API
let users = [];    // Fetched from server for student selection

// ---------- Fetch Data from API ----------
async function loadNoticeData() {
  try {
    users = await fetchUsers();       // API: returns all users
    notices = await fetchNotices();   // API: returns all notices
    renderNoticeTable();
  } catch (err) {
    console.error('Failed to load notices/users from API', err);
  }
}

// ---------- Elements ----------
const form = document.getElementById('addNoticeForm');
const publishSelect = document.getElementById('noticePublishSelect');
const studentContainer = document.getElementById('noticeStudentContainer');
const studentSelect = document.getElementById('noticeStudentSelect');
const tableBody = document.querySelector('#noticeTable tbody');

// ---------- Show/hide student select ----------
publishSelect.addEventListener('change', () => {
  if (publishSelect.value === 'specific') {
    studentContainer.style.display = 'block';
    renderStudentOptions();
  } else {
    studentContainer.style.display = 'none';
  }
});

function renderStudentOptions() {
  studentSelect.innerHTML = '';
  users.filter(u => u.role === 'student').forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.username;
    opt.textContent = `${s.username} (${s.email})`;
    studentSelect.appendChild(opt);
  });
}

// ---------- Add Notice ----------
form.addEventListener('submit', async e => {
  e.preventDefault();
  const title = document.getElementById('noticeTitle').value.trim();
  const message = document.getElementById('noticeMessage').value.trim();
  const publishTo = publishSelect.value;

  if (!title || !message) return alert('All fields are required.');

  let assignedStudents = [];
  if (publishTo === 'all') {
    assignedStudents = users.filter(u => u.role === 'student').map(s => s.username);
  } else {
    assignedStudents = Array.from(studentSelect.selectedOptions).map(o => o.value);
  }

  const notice = { title, message, assignedStudents };

  try {
    const savedNotice = await addNotice(notice); // API call
    notices.push(savedNotice);
    form.reset();
    studentContainer.style.display = 'none';
    renderNoticeTable();
    showFloatingNotification('Notice published successfully!');
  } catch (err) {
    console.error('Failed to save notice', err);
    alert('Failed to publish notice!');
  }
});

// ---------- Render Notice Table ----------
function renderNoticeTable() {
  tableBody.innerHTML = '';
  notices.forEach((n, index) => {
    const publishedToText = n.assignedStudents.length === users.filter(u => u.role === 'student').length
                            ? 'All Students'
                            : n.assignedStudents.join(', ');

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${n.title}</td>
      <td>${n.message}</td>
      <td>${publishedToText}</td>
      <td>
        <button onclick="editNoticeAPI('${n.id}')">✏️ Edit</button>
        <button onclick="deleteNoticeAPI('${n.id}')">🗑️ Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

// ---------- Edit Notice ----------
async function editNoticeAPI(id) {
  const n = notices.find(n => n.id === id);
  if (!n) return;
  const newTitle = prompt('Edit Title:', n.title);
  const newMessage = prompt('Edit Message:', n.message);
  if (newTitle && newMessage) {
    try {
      const updated = await editNotice(id, { title: newTitle, message: newMessage }); // API
      const idx = notices.findIndex(n => n.id === id);
      notices[idx] = updated;
      renderNoticeTable();
      showFloatingNotification('Notice updated successfully!');
    } catch (err) {
      console.error('Failed to update notice', err);
      alert('Failed to update notice!');
    }
  }
}

// ---------- Delete Notice ----------
async function deleteNoticeAPI(id) {
  if (!confirm('Delete this notice?')) return;
  try {
    await deleteNotice(id); // API call
    notices = notices.filter(n => n.id !== id);
    renderNoticeTable();
    showFloatingNotification('Notice deleted!');
  } catch (err) {
    console.error('Failed to delete notice', err);
    alert('Failed to delete notice!');
  }
}

// ---------- Floating Notification ----------
function showFloatingNotification(msg) {
  const notif = document.createElement('div');
  notif.className = 'floatingNotification';
  notif.innerText = msg;
  document.getElementById('floatingContainer').appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', loadNoticeData);

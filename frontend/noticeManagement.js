// ---------- Notice Management (JSON-based) ----------
let notices = [];  // Will be fetched from JSON
let users = [];    // Will be fetched from JSON for student selection

// ---------- Fetch JSON Data ----------
async function loadNoticeData() {
  try {
    const resUsers = await fetch('data/users.json');
    users = await resUsers.json();

    const resNotices = await fetch('data/notices.json');
    notices = await resNotices.json();

    renderNoticeTable();
  } catch (err) {
    console.error(err);
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
  notices.push(notice);
  await saveNotices();

  form.reset();
  studentContainer.style.display = 'none';
  renderNoticeTable();
  showFloatingNotification('Notice published successfully!');
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
        <button onclick="editNotice(${index})">✏️ Edit</button>
        <button onclick="deleteNotice(${index})">🗑️ Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

// ---------- Edit Notice ----------
async function editNotice(index) {
  const n = notices[index];
  const newTitle = prompt('Edit Title:', n.title);
  const newMessage = prompt('Edit Message:', n.message);
  if (newTitle && newMessage) {
    n.title = newTitle;
    n.message = newMessage;
    await saveNotices();
    renderNoticeTable();
    showFloatingNotification('Notice updated successfully!');
  }
}

// ---------- Delete Notice ----------
async function deleteNotice(index) {
  if (confirm('Delete this notice?')) {
    notices.splice(index, 1);
    await saveNotices();
    renderNoticeTable();
    showFloatingNotification('Notice deleted!');
  }
}

// ---------- Save Notices to JSON (simulate POST to server) ----------
async function saveNotices() {
  await fetch('api/saveNotices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notices)
  });
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

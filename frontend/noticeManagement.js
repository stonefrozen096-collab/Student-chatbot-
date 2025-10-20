let notices = JSON.parse(localStorage.getItem('notices') || '[]');
let users = JSON.parse(localStorage.getItem('users') || '[]'); // For specific student selection

const form = document.getElementById('addNoticeForm');
const publishSelect = document.getElementById('noticePublishSelect');
const studentContainer = document.getElementById('noticeStudentContainer');
const studentSelect = document.getElementById('noticeStudentSelect');
const tableBody = document.querySelector('#noticeTable tbody');

// Show/hide student select
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

// Add notice
form.addEventListener('submit', e => {
  e.preventDefault();
  const title = document.getElementById('noticeTitle').value.trim();
  const message = document.getElementById('noticeMessage').value.trim();
  const publishTo = publishSelect.value;

  if(!title || !message) return alert('All fields are required.');

  let assignedStudents = [];
  if(publishTo === 'all') {
    assignedStudents = users.filter(u => u.role === 'student').map(s => s.username);
  } else {
    assignedStudents = Array.from(studentSelect.selectedOptions).map(o => o.value);
  }

  const notice = { title, message, assignedStudents };
  notices.push(notice);
  localStorage.setItem('notices', JSON.stringify(notices));

  form.reset();
  studentContainer.style.display = 'none';
  renderNoticeTable();
  showFloatingNotification('Notice published successfully!');
});

// Render notices
function renderNoticeTable() {
  tableBody.innerHTML = '';
  notices.forEach((n, index) => {
    const row = document.createElement('tr');
    const publishedToText = n.assignedStudents.length === users.filter(u => u.role==='student').length
                            ? 'All Students'
                            : n.assignedStudents.join(', ');
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

// Edit notice
function editNotice(index) {
  const n = notices[index];
  const newTitle = prompt('Edit Title:', n.title);
  const newMessage = prompt('Edit Message:', n.message);
  if(newTitle && newMessage) {
    n.title = newTitle;
    n.message = newMessage;
    localStorage.setItem('notices', JSON.stringify(notices));
    renderNoticeTable();
  }
}

// Delete notice
function deleteNotice(index) {
  if(confirm('Delete this notice?')) {
    notices.splice(index, 1);
    localStorage.setItem('notices', JSON.stringify(notices));
    renderNoticeTable();
  }
}

// Floating notification
function showFloatingNotification(msg) {
  const notif = document.createElement('div');
  notif.className = 'floatingNotification';
  notif.innerText = msg;
  document.getElementById('floatingContainer').appendChild(notif);
  setTimeout(()=>notif.remove(), 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', renderNoticeTable);

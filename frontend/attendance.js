// ---------- Attendance Management (API + Socket.IO Version) ----------
import * as api from './api.js';
const socket = io();

let students = [];
let attendanceRecords = [];
let isSaving = false;

// ---------- Load Attendance ----------
async function loadAttendanceData() {
  showLoading(true);
  try {
    students = await api.getUsers();
    attendanceRecords = await api.getAttendance();
    renderAttendance();
  } catch (err) {
    console.error('⚠️ Error loading attendance:', err);
    showAttendanceMsg('❌ Failed to load data from server', 'error');
  } finally {
    showLoading(false);
  }
}

// ---------- Render Attendance Table ----------
function renderAttendance() {
  const tbody = document.querySelector('#attendanceTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const date = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];
  const studentList = students.filter(s => s.role === 'student');

  if (!studentList.length) {
    tbody.innerHTML = '<tr><td colspan="6">No students found.</td></tr>';
    return;
  }

  studentList.forEach(student => {
    const record = attendanceRecords.find(r => r.username === student.username && r.date === date) || {};
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${student.name || student.username}</td>
      <td><input type="radio" name="att-${student.username}" value="present" ${record.status === 'present' ? 'checked' : ''}></td>
      <td><input type="radio" name="att-${student.username}" value="absent" ${record.status === 'absent' ? 'checked' : ''}></td>
      <td><input type="radio" name="att-${student.username}" value="late" ${record.status === 'late' ? 'checked' : ''}></td>
      <td><input type="radio" name="att-${student.username}" value="onduty" ${record.status === 'onduty' ? 'checked' : ''}></td>
      <td class="statusCell">${record.status ? record.status.toUpperCase() : '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------- Save Attendance ----------
async function saveAttendance() {
  if (isSaving) return;
  isSaving = true;
  showSaving(true);

  const date = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];

  const updatedRecords = students
    .filter(s => s.role === 'student')
    .map(s => {
      const selected = document.querySelector(`input[name="att-${s.username}"]:checked`);
      return { username: s.username, date, status: selected ? selected.value : null };
    });

  try {
    await api.saveAttendance(updatedRecords);
    attendanceRecords = attendanceRecords.filter(r => r.date !== date).concat(updatedRecords);

    renderAttendance();
    showAttendanceMsg('✅ Attendance saved successfully!', 'success');
    socket.emit('attendanceUpdated', { date, records: updatedRecords });
  } catch (err) {
    console.error('Error saving attendance:', err);
    showAttendanceMsg('❌ Failed to save attendance!', 'error');
  } finally {
    isSaving = false;
    showSaving(false);
  }
}

// ---------- Socket.IO Sync ----------
socket.on('attendanceUpdated', ({ date, records }) => {
  const currentDate = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];
  if (date === currentDate) {
    attendanceRecords = attendanceRecords.filter(r => r.date !== date).concat(records);
    renderAttendance();
    showAttendanceMsg('🔄 Attendance updated (real-time)', 'info');
  }
});

// ---------- Quick Buttons ----------
window.markAllPresent = () => {
  document.querySelectorAll('input[type=radio][value=present]').forEach(r => (r.checked = true));
};
window.markAllAbsent = () => {
  document.querySelectorAll('input[type=radio][value=absent]').forEach(r => (r.checked = true));
};

// ---------- UI Feedback ----------
function showLoading(show) {
  let el = document.getElementById('loadingIndicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loadingIndicator';
    el.className = 'overlayLoader';
    el.innerHTML = '<div class="spinner"></div><span>Loading attendance...</span>';
    document.body.appendChild(el);
  }
  el.style.display = show ? 'flex' : 'none';
}

function showSaving(show) {
  let el = document.getElementById('savingIndicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'savingIndicator';
    el.className = 'savingOverlay';
    el.innerHTML = '<div class="spinner"></div><span>Saving attendance...</span>';
    document.body.appendChild(el);
  }
  el.style.display = show ? 'flex' : 'none';
}

function showAttendanceMsg(msg, type = 'info') {
  const msgDiv = document.createElement('div');
  msgDiv.className = `attendanceMsg ${type}`;
  msgDiv.innerText = msg;
  document.body.appendChild(msgDiv);
  msgDiv.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });

  setTimeout(() => {
    msgDiv.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 }).onfinish = () => msgDiv.remove();
  }, 2000);
}

// ---------- Expose ----------
window.saveAttendance = saveAttendance;

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', loadAttendanceData);

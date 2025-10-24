// ---------- Attendance Management (API + Socket.IO) ----------
import * as api from './api.js';

const socket = io();

let students = [];
let attendanceRecords = [];
let isSaving = false;

// ---------- Load Data from API ----------
async function loadAttendanceData() {
  showLoading(true);
  try {
    students = await api.getUsers(); // All users
    attendanceRecords = await api.getAttendance(); // [{ username, date, status }]
    renderAttendance();
  } catch (err) {
    console.error('Error loading attendance data:', err);
    alert('⚠️ Failed to load attendance data. Please check server connection.');
  } finally {
    showLoading(false);
  }
}

// ---------- Render Attendance Table ----------
function renderAttendance() {
  const tbody = document.querySelector('#attendanceTable tbody');
  tbody.innerHTML = '';
  const date = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];

  const studentList = students.filter(s => s.role === 'student');

  if (!studentList.length) {
    tbody.innerHTML = '<tr><td colspan="6">No students found.</td></tr>';
    return;
  }

  studentList.forEach(student => {
    const record = attendanceRecords.find(a => a.username === student.username && a.date === date) || {};
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${student.name || student.username}</td>
      <td><input type="radio" name="att-${student.username}" value="present" ${record.status === 'present' ? 'checked' : ''}></td>
      <td><input type="radio" name="att-${student.username}" value="absent" ${record.status === 'absent' ? 'checked' : ''}></td>
      <td><input type="radio" name="att-${student.username}" value="late" ${record.status === 'late' ? 'checked' : ''}></td>
      <td><input type="radio" name="att-${student.username}" value="onduty" ${record.status === 'onduty' ? 'checked' : ''}></td>
      <td>${record.status ? record.status.toUpperCase() : '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------- Save Attendance to API ----------
async function saveAttendance() {
  if (isSaving) return;
  isSaving = true;
  showSaving(true);

  const date = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];

  const updatedRecords = students
    .filter(s => s.role === 'student')
    .map(student => {
      const radios = document.getElementsByName(`att-${student.username}`);
      const selected = Array.from(radios).find(r => r.checked)?.value || null;
      return { username: student.username, date, status: selected };
    });

  try {
    await api.saveAttendance(updatedRecords);
    attendanceRecords = updatedRecords;
    showAttendanceMsg('✅ Attendance saved successfully!');
    socket.emit('attendanceUpdated', { date, records: updatedRecords });
  } catch (err) {
    console.error('Error saving attendance:', err);
    alert('❌ Failed to save attendance!');
  } finally {
    isSaving = false;
    showSaving(false);
  }
}

// ---------- Listen for Real-time Updates ----------
socket.on('attendanceUpdated', data => {
  if (data?.records) {
    const currentDate = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];
    if (data.date === currentDate) {
      attendanceRecords = data.records;
      renderAttendance();
      showAttendanceMsg('🔁 Attendance updated (real-time)');
    }
  }
});

// ---------- Quick Mark Buttons ----------
function markAllPresent() {
  document.querySelectorAll('input[type=radio][value=present]').forEach(r => (r.checked = true));
}
function markAllAbsent() {
  document.querySelectorAll('input[type=radio][value=absent]').forEach(r => (r.checked = true));
}

// ---------- Visual Indicators ----------
function showLoading(show) {
  let loader = document.getElementById('loadingIndicator');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'loadingIndicator';
    loader.className = 'overlayLoader';
    loader.innerHTML = '<div class="spinner"></div><span>Loading attendance...</span>';
    document.body.appendChild(loader);
  }
  loader.style.display = show ? 'flex' : 'none';
}

function showSaving(show) {
  let saving = document.getElementById('savingIndicator');
  if (!saving) {
    saving = document.createElement('div');
    saving.id = 'savingIndicator';
    saving.className = 'savingOverlay';
    saving.innerHTML = '<div class="spinner"></div><span>Saving attendance...</span>';
    document.body.appendChild(saving);
  }
  saving.style.display = show ? 'flex' : 'none';
}

function showAttendanceMsg(msg) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'successMsg';
  msgDiv.innerText = msg;
  document.body.appendChild(msgDiv);
  setTimeout(() => msgDiv.remove(), 2000);
}

// ---------- Expose functions ----------
window.saveAttendance = saveAttendance;
window.markAllPresent = markAllPresent;
window.markAllAbsent = markAllAbsent;

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', loadAttendanceData);

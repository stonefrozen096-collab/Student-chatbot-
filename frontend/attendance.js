// ---------- Attendance Management (API + Socket.IO) ----------
import * as api from './api.js';

const socket = io(); // Connect to Socket.IO server

let students = [];
let attendanceRecords = [];

// ---------- Load Data from API ----------
async function loadAttendanceData() {
  try {
    students = await api.getUsers(); // All users
    attendanceRecords = await api.getAttendance(); // Returns array of {username, date, status}
  } catch (err) {
    console.error('Error loading data from API:', err);
    students = [];
    attendanceRecords = [];
  }
  renderAttendance();
}

// ---------- Render Attendance Table ----------
function renderAttendance() {
  const tbody = document.querySelector('#attendanceTable tbody');
  tbody.innerHTML = '';
  const date = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];

  students.filter(s => s.role === 'student').forEach(student => {
    const record = attendanceRecords.find(a => a.username === student.username && a.date === date) || {};
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${student.name}</td>
      <td><input type="radio" name="att-${student.username}" value="present" ${record.status === 'present' ? 'checked' : ''}></td>
      <td><input type="radio" name="att-${student.username}" value="absent" ${record.status === 'absent' ? 'checked' : ''}></td>
      <td><input type="radio" name="att-${student.username}" value="late" ${record.status === 'late' ? 'checked' : ''}></td>
      <td><input type="radio" name="att-${student.username}" value="onduty" ${record.status === 'onduty' ? 'checked' : ''}></td>
      <td>${record.status || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------- Save Attendance to API ----------
async function saveAttendance() {
  const date = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];

  const updatedRecords = students.filter(s => s.role === 'student').map(student => {
    const radios = document.getElementsByName(`att-${student.username}`);
    const selected = Array.from(radios).find(r => r.checked)?.value || null;
    return { username: student.username, date, status: selected };
  });

  try {
    await api.saveAttendance(updatedRecords);
    attendanceRecords = updatedRecords;
    renderAttendance();
    showAttendanceMsg();
    
    // Emit real-time update to all connected clients
    socket.emit('attendanceUpdated', { date, records: updatedRecords });
  } catch (err) {
    console.error('Error saving attendance via API:', err);
    alert('Failed to save attendance!');
  }
}

// ---------- Listen for real-time updates ----------
socket.on('attendanceUpdated', data => {
  // Update local cache and re-render
  if (data?.records) {
    const date = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];
    if (data.date === date) {
      attendanceRecords = data.records;
      renderAttendance();
    }
  }
});

// ---------- Optional Buttons ----------
function markAllPresent() {
  document.querySelectorAll('input[type=radio][value=present]').forEach(r => r.checked = true);
}
function markAllAbsent() {
  document.querySelectorAll('input[type=radio][value=absent]').forEach(r => r.checked = true);
}

// ---------- Success Animation ----------
function showAttendanceMsg() {
  const msg = document.createElement('div');
  msg.className = 'successMsg';
  msg.innerText = '✅ Attendance saved!';
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 2000);
}

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', loadAttendanceData);

// ---------- Expose functions to HTML buttons ----------
window.saveAttendance = saveAttendance;
window.markAllPresent = markAllPresent;
window.markAllAbsent = markAllAbsent;

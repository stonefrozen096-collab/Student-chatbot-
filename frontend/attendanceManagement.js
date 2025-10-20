// ---------- Attendance Management (JSON Version) ----------

let students = [];
let attendanceRecords = [];

// ---------- Load JSON Data ----------
async function loadAttendanceData() {
  try {
    const resUsers = await fetch('data/users.json');
    students = await resUsers.json();

    const resAttendance = await fetch('data/attendance.json');
    attendanceRecords = await resAttendance.json();
  } catch (err) {
    console.error('Error loading JSON:', err);
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
      <td>${student.username}</td>
      <td><input type="radio" name="att-${student.username}" value="present" ${record.status === 'present' ? 'checked' : ''}></td>
      <td><input type="radio" name="att-${student.username}" value="absent" ${record.status === 'absent' ? 'checked' : ''}></td>
      <td><input type="radio" name="att-${student.username}" value="late" ${record.status === 'late' ? 'checked' : ''}></td>
      <td><input type="radio" name="att-${student.username}" value="onduty" ${record.status === 'onduty' ? 'checked' : ''}></td>
      <td>${record.status || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ---------- Save Attendance to JSON ----------
async function saveAttendance() {
  const date = document.getElementById('attendanceDate').value || new Date().toISOString().split('T')[0];

  students.filter(s => s.role === 'student').forEach(student => {
    const radios = document.getElementsByName(`att-${student.username}`);
    const selected = Array.from(radios).find(r => r.checked)?.value || null;

    const existing = attendanceRecords.find(a => a.username === student.username && a.date === date);
    if (existing) existing.status = selected;
    else attendanceRecords.push({ username: student.username, date, status: selected });
  });

  // Save to JSON file via backend API
  try {
    await fetch('api/saveAttendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendanceRecords)
    });
    renderAttendance();
    showAttendanceMsg();
  } catch (err) {
    console.error('Error saving attendance:', err);
    alert('Failed to save attendance!');
  }
}

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

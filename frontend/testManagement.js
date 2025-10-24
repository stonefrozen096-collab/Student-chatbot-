// ---------- Test Management System ----------
import { getTests, createTest, deleteTest, getUsers } from './api.js';

let tests = [];
let users = [];
let options = [];

// ---------- DOM Elements ----------
const form = document.getElementById('createTestForm');
const typeSelect = document.getElementById('testType');
const mcqSection = document.getElementById('mcqSection');
const optionContainer = document.getElementById('optionContainer');
const addOptionBtn = document.getElementById('addOptionBtn');
const correctAnswerSelect = document.getElementById('correctAnswerSelect');
const publishSelect = document.getElementById('publishSelect');
const studentSelectContainer = document.getElementById('studentSelectContainer');
const studentSelect = document.getElementById('studentSelect');
const testTable = document.querySelector('#testTable tbody');
const confettiContainer = document.getElementById('confettiContainer');
const floatingContainer = document.getElementById('floatingContainer');

// ---------- Load Initial Data ----------
async function loadData() {
  showLoader(true);
  try {
    users = await getUsers();
    tests = await getTests();
  } catch (err) {
    console.error('Error loading data:', err);
    alert('⚠️ Failed to load data. Please check server connection.');
  } finally {
    showLoader(false);
  }
  renderOptions();
  renderStudentOptions();
  renderTestTable();
}

// ---------- Type Change (MCQ toggle) ----------
typeSelect.addEventListener('change', () => {
  mcqSection.style.display = typeSelect.value === 'mcq' ? 'block' : 'none';
  options = [];
  renderOptions();
});

// ---------- Add Option ----------
addOptionBtn.addEventListener('click', () => {
  const text = prompt('Enter option text:');
  if (text) {
    options.push(text.trim());
    renderOptions();
  }
});

// ---------- Render Options ----------
function renderOptions() {
  optionContainer.innerHTML = '';
  correctAnswerSelect.innerHTML = '';

  if (!options.length) {
    optionContainer.innerHTML = '<em>No options added yet.</em>';
    return;
  }

  options.forEach((opt, i) => {
    const div = document.createElement('div');
    div.className = 'option-item';
    div.innerHTML = `
      <span>${i + 1}. ${opt}</span>
      <button type="button" class="removeBtn" data-index="${i}">❌</button>
    `;
    optionContainer.appendChild(div);

    const optElem = document.createElement('option');
    optElem.value = i;
    optElem.textContent = opt;
    correctAnswerSelect.appendChild(optElem);
  });

  // Remove option handler
  optionContainer.querySelectorAll('.removeBtn').forEach(btn =>
    btn.addEventListener('click', e => {
      const index = e.target.getAttribute('data-index');
      options.splice(index, 1);
      renderOptions();
    })
  );
}

// ---------- Publish Target ----------
publishSelect.addEventListener('change', () => {
  if (publishSelect.value === 'specific') {
    studentSelectContainer.style.display = 'block';
    renderStudentOptions();
  } else {
    studentSelectContainer.style.display = 'none';
  }
});

// ---------- Render Student Options ----------
function renderStudentOptions() {
  studentSelect.innerHTML = '';
  const studentList = users.filter(u => u.role === 'student');
  if (!studentList.length) {
    studentSelect.innerHTML = '<option disabled>No students available</option>';
    return;
  }
  studentList.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.username;
    opt.textContent = `${s.username} (${s.email})`;
    studentSelect.appendChild(opt);
  });
}

// ---------- Create Test ----------
form.addEventListener('submit', async e => {
  e.preventDefault();

  const title = document.getElementById('testTitle').value.trim();
  const subject = document.getElementById('testSubject').value.trim();
  const type = typeSelect.value;
  const publishTo = publishSelect.value;

  if (!title || !subject) return alert('All fields are required.');
  if (type === 'mcq' && (!options.length || correctAnswerSelect.selectedIndex === -1))
    return alert('Please add options and select the correct answer.');

  let assignedStudents = [];
  if (publishTo === 'all') {
    assignedStudents = users.filter(u => u.role === 'student').map(s => s.username);
  } else if (publishTo === 'specific') {
    assignedStudents = Array.from(studentSelect.selectedOptions).map(o => o.value);
  }

  const test = {
    title,
    subject,
    type,
    options: [...options],
    correct: correctAnswerSelect.value,
    assignedStudents
  };

  try {
    await createTest(test);
    showSuccessNotification('✅ Test created & published!');
    showConfetti();
    await refreshTests();
  } catch (err) {
    console.error('Error creating test:', err);
    alert('❌ Failed to create test.');
  }

  // Reset form
  form.reset();
  options = [];
  studentSelectContainer.style.display = 'none';
  renderOptions();
});

// ---------- Refresh Tests ----------
async function refreshTests() {
  try {
    tests = await getTests();
  } catch (err) {
    console.error('Error refreshing tests:', err);
  }
  renderTestTable();
}

// ---------- Render Test Table ----------
function renderTestTable() {
  testTable.innerHTML = '';

  if (!tests.length) {
    testTable.innerHTML = '<tr><td colspan="5">No tests available.</td></tr>';
    return;
  }

  tests.forEach((t, index) => {
    const totalStudents = users.filter(u => u.role === 'student').length;
    const publishedText =
      (t.assignedStudents?.length || 0) === totalStudents
        ? 'All Students'
        : (t.assignedStudents || []).join(', ') || '-';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${t.title}</td>
      <td>${t.subject}</td>
      <td>${t.type.toUpperCase()}</td>
      <td>${publishedText}</td>
      <td><button type="button" class="deleteBtn" data-id="${t._id || index}">🗑️ Delete</button></td>
    `;
    testTable.appendChild(row);
  });

  // Delete handlers
  testTable.querySelectorAll('.deleteBtn').forEach(btn =>
    btn.addEventListener('click', e => {
      const id = e.target.getAttribute('data-id');
      deleteTestEntry(id);
    })
  );
}

// ---------- Delete Test ----------
async function deleteTestEntry(id) {
  if (!confirm('Delete this test?')) return;
  try {
    await deleteTest(id);
    showSuccessNotification('🗑️ Test deleted successfully!');
    await refreshTests();
  } catch (err) {
    console.error('Error deleting test:', err);
    alert('❌ Failed to delete test.');
  }
}

// ---------- Visual Feedback ----------
function showLoader(show) {
  let loader = document.getElementById('globalLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.className = 'overlayLoader';
    loader.innerHTML = '<div class="spinner"></div><span>Loading...</span>';
    document.body.appendChild(loader);
  }
  loader.style.display = show ? 'flex' : 'none';
}

function showSuccessNotification(msg) {
  const notif = document.createElement('div');
  notif.className = 'floatingNotification';
  notif.innerText = msg;
  floatingContainer.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

function showConfetti() {
  import('https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.0/dist/confetti.browser.js')
    .then(({ default: confetti }) => {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    });
}

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', loadData);

// ---------- Test Management (JSON-based) ----------
let tests = [];
let users = [];
let options = [];

// ---------- Elements ----------
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

// ---------- Load JSON Data ----------
async function loadData() {
  try {
    const resUsers = await fetch('data/users.json');
    users = await resUsers.json();
  } catch(e){ console.error('Failed to load users', e); }

  try {
    const resTests = await fetch('data/tests.json');
    tests = await resTests.json();
  } catch(e){ console.error('Failed to load tests', e); }

  renderOptions();
  renderStudentOptions();
  renderTestTable();
}

// ---------- MCQ Section Toggle ----------
typeSelect.addEventListener('change', () => {
  mcqSection.style.display = typeSelect.value === 'mcq' ? 'block' : 'none';
  options = [];
  renderOptions();
});

// ---------- Add Option ----------
addOptionBtn.addEventListener('click', () => {
  const optionText = prompt('Enter option text:');
  if(optionText) {
    options.push(optionText);
    renderOptions();
  }
});

// ---------- Render Options ----------
function renderOptions() {
  optionContainer.innerHTML = '';
  correctAnswerSelect.innerHTML = '';

  options.forEach((opt, index) => {
    const div = document.createElement('div');
    div.textContent = `${index + 1}. ${opt}`;
    optionContainer.appendChild(div);

    const optElem = document.createElement('option');
    optElem.value = index;
    optElem.textContent = opt;
    correctAnswerSelect.appendChild(optElem);
  });
}

// ---------- Publish Select Toggle ----------
publishSelect.addEventListener('change', () => {
  if(publishSelect.value === 'specific') {
    studentSelectContainer.style.display = 'block';
    renderStudentOptions();
  } else {
    studentSelectContainer.style.display = 'none';
  }
});

// ---------- Render Student Options ----------
function renderStudentOptions() {
  studentSelect.innerHTML = '';
  users.filter(u => u.role === 'student').forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.username;
    opt.textContent = `${s.username} (${s.email})`;
    studentSelect.appendChild(opt);
  });
}

// ---------- Save Tests JSON ----------
async function saveTests() {
  await fetch('api/saveTests', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(tests)
  });
}

// ---------- Create & Publish Test ----------
form.addEventListener('submit', async e => {
  e.preventDefault();

  const title = document.getElementById('testTitle').value.trim();
  const subject = document.getElementById('testSubject').value.trim();
  const type = typeSelect.value;
  const publishTo = publishSelect.value;

  if(!title || !subject) return alert('All fields required.');

  let assignedStudents = [];
  if(publishTo === 'all') {
    assignedStudents = users.filter(u => u.role==='student').map(s => s.username);
  } else {
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

  tests.push(test);
  await saveTests();

  showSuccessNotification('✅ Test created & published!');
  showConfetti();

  form.reset();
  options = [];
  studentSelectContainer.style.display = 'none';
  renderOptions();
  renderTestTable();
});

// ---------- Render Test Table ----------
function renderTestTable() {
  testTable.innerHTML = '';
  tests.forEach((t, index) => {
    const publishedToText = t.assignedStudents.length === users.filter(u => u.role==='student').length
                            ? 'All Students'
                            : t.assignedStudents.join(', ');

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${t.title}</td>
      <td>${t.subject}</td>
      <td>${t.type}</td>
      <td>${publishedToText}</td>
      <td>
        <button onclick="deleteTest(${index})">🗑️ Delete</button>
      </td>
    `;
    testTable.appendChild(row);
  });
}

// ---------- Delete Test ----------
async function deleteTest(index) {
  if(confirm('Delete this test?')) {
    tests.splice(index,1);
    await saveTests();
    renderTestTable();
  }
}

// ---------- Floating Success Notification ----------
function showSuccessNotification(msg) {
  const notif = document.createElement('div');
  notif.className = 'floatingNotification';
  notif.innerText = msg;
  document.body.appendChild(notif);
  setTimeout(()=>notif.remove(), 3000);
}

// ---------- Confetti Animation ----------
function showConfetti() {
  for(let i=0;i<50;i++){
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.left = Math.random()*100 + '%';
    confetti.style.backgroundColor = `hsl(${Math.random()*360}, 80%, 60%)`;
    confettiContainer.appendChild(confetti);

    const fallDuration = 2000 + Math.random()*2000;
    confetti.animate([
      { transform: `translateY(0px) rotate(0deg)`, opacity: 1 },
      { transform: `translateY(300px) rotate(${Math.random()*360}deg)`, opacity: 0 }
    ], { duration: fallDuration, iterations: 1, easing: 'ease-out' });

    setTimeout(() => confetti.remove(), fallDuration);
  }
}

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', loadData);

// student.js

// ----------------------
// API base URL
// ----------------------
const API_URL = "http://localhost:3000";

// ----------------------
// DOM elements
// ----------------------
const studentRegno = document.getElementById("student-regno");
const attendanceContainer = document.getElementById("attendance-container");
const examsContainer = document.getElementById("exams-container");
const noticesContainer = document.getElementById("notices-container");
const notesContainer = document.getElementById("notes-container");
const chatbotForm = document.getElementById("chatbot-form");
const chatbotInput = document.getElementById("chatbot-input");
const chatbotMessages = document.getElementById("chatbot-messages");

// ----------------------
// Fetch attendance
// ----------------------
async function fetchAttendance() {
  const regno = studentRegno.value;
  if (!regno) return;

  try {
    const res = await fetch(`${API_URL}/student/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regno }),
    });
    const data = await res.json();
    renderAttendance(data);
  } catch (err) {
    console.error("Error fetching attendance:", err);
  }
}

function renderAttendance(data) {
  attendanceContainer.innerHTML = "";
  if (!data.length) {
    attendanceContainer.innerHTML = "<p>No attendance data found.</p>";
    return;
  }
  data.forEach((att) => {
    const div = document.createElement("div");
    div.className = "attendance-item";
    div.innerHTML = `<strong>${att.subject}</strong>: ${att.percentage}%`;
    attendanceContainer.appendChild(div);
  });
}

// ----------------------
// Fetch exams
// ----------------------
async function fetchExams() {
  const res = await fetch(`${API_URL}/student/exams`, { method: "POST" });
  const data = await res.json();
  examsContainer.innerHTML = "";
  data.forEach((exam) => {
    const div = document.createElement("div");
    div.className = "exam-item";
    div.innerHTML = `<strong>${exam.name}</strong> - ${exam.date}`;
    examsContainer.appendChild(div);
  });
}

// ----------------------
// Fetch notices
// ----------------------
async function fetchNotices() {
  const res = await fetch(`${API_URL}/student/notices`, { method: "POST" });
  const data = await res.json();
  noticesContainer.innerHTML = "";
  data.forEach((notice) => {
    const div = document.createElement("div");
    div.className = "notice-item";
    div.innerText = notice;
    noticesContainer.appendChild(div);
  });
}

// ----------------------
// Fetch notes
// ----------------------
async function fetchNotes() {
  const regno = studentRegno.value;
  if (!regno) return;

  try {
    const res = await fetch(`${API_URL}/student/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regno }),
    });
    const data = await res.json();
    renderNotes(data);
  } catch (err) {
    console.error("Error fetching notes:", err);
  }
}

function renderNotes(data) {
  notesContainer.innerHTML = "";
  if (!data.length) {
    notesContainer.innerHTML = "<p>No notes found.</p>";
    return;
  }
  data.forEach((note) => {
    const div = document.createElement("div");
    div.className = "note-item";
    div.innerHTML = `<strong>${note.faculty}</strong>: ${note.note}`;
    notesContainer.appendChild(div);
  });
}

// ----------------------
// Chatbot interaction
// ----------------------
chatbotForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = chatbotInput.value.trim();
  if (!msg) return;

  appendMessage("You", msg);
  chatbotInput.value = "";

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    });
    const data = await res.json();
    appendMessage("Bot", data.reply);
  } catch (err) {
    console.error("Error sending message to chatbot:", err);
    appendMessage("Bot", "Error connecting to server.");
  }
});

function appendMessage(sender, text) {
  const div = document.createElement("div");
  div.className = sender === "Bot" ? "chatbot-message bot" : "chatbot-message user";
  div.innerText = text;
  chatbotMessages.appendChild(div);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

// ----------------------
// Initialize
// ----------------------
function initStudentPage() {
  fetchAttendance();
  fetchExams();
  fetchNotices();
  fetchNotes();
}

window.addEventListener("load", initStudentPage);
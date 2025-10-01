// api.js

// ----------------------
// Helper function for POST requests
// ----------------------
async function postData(url = "", data = {}) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (err) {
    console.error("POST Error:", err);
    return { msg: "Error connecting to server" };
  }
}

// ----------------------
// Helper function for GET requests
// ----------------------
async function getData(url = "") {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (err) {
    console.error("GET Error:", err);
    return { msg: "Error connecting to server" };
  }
}

// ----------------------
// Admin API Calls
// ----------------------
async function adminLogin(username, password) {
  return await postData("/admin/login", { username, password });
}

async function addStudent(regno, name) {
  return await postData("/admin/add-user", { username: "admin", password: "adminpassword", regno, name });
}

async function removeStudent(regno) {
  return await postData("/admin/remove-user", { username: "admin", password: "adminpassword", regno });
}

async function addFaculty(username, password, name, department) {
  return await postData("/admin/add-faculty", { username: "admin", password: "adminpassword", username, password, name, department });
}

async function removeFaculty(username) {
  return await postData("/admin/remove-faculty", { username: "admin", password: "adminpassword", username });
}

async function addNotice(notice) {
  return await postData("/admin/add-notice", { username: "admin", password: "adminpassword", notice });
}

async function addExam(name, date) {
  return await postData("/admin/add-exam", { username: "admin", password: "adminpassword", name, date });
}

async function assignBadge(username, role) {
  return await postData("/admin/assign-badge", { username: "admin", password: "adminpassword", username, role });
}

// ----------------------
// Faculty API Calls
// ----------------------
async function facultyLogin(username, password) {
  return await postData("/faculty/login", { username, password });
}

async function addNote(studentReg, faculty, note, isPublic) {
  return await postData("/faculty/add-note", { studentReg, faculty, note, publicNote: isPublic });
}

async function markAttendance(studentReg, subject, percentage, faculty) {
  return await postData("/faculty/mark-attendance", { studentReg, subject, percentage, faculty });
}

async function addAssignment(studentReg, faculty, file) {
  return await postData("/faculty/add-assignment", { studentReg, faculty, file });
}

// ----------------------
// Student API Calls
// ----------------------
async function studentLogin(regno) {
  return await postData("/login", { regno });
}

async function getAttendance(regno) {
  return await postData("/student/attendance", { regno });
}

async function getExams() {
  return await postData("/student/exams");
}

async function getNotices() {
  return await postData("/student/notices");
}

async function getNotes(regno) {
  return await postData("/student/notes", { regno });
}

// ----------------------
// Chatbot API
// ----------------------
async function chatBotQuery(message) {
  return await postData("/chat", { message });
}

// ----------------------
// Forgot Password
// ----------------------
async function requestAdminReset(email) {
  return await postData("/admin/forgot-password", { email });
}

async function resetAdminPassword(token, newPassword) {
  return await postData("/admin/reset-password", { token, newPassword });
}
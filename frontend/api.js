// api.js — unified API for Student Assistant system

const BASE_URL = "https://feathers-26g1.onrender.com";

// ============================
// ADMIN
// ============================
export async function adminLogin(username, password) {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ username, password })
  });
  return res.json();
}

export async function adminSetup(password) {
  const res = await fetch(`${BASE_URL}/api/admin/setup`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ password })
  });
  return res.json();
}

export async function adminForgotPassword(email) {
  const res = await fetch(`${BASE_URL}/api/admin/forgot-password`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email })
  });
  return res.json();
}

export async function adminResetPassword(token, newPassword) {
  const res = await fetch(`${BASE_URL}/api/admin/reset-password`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ token, newPassword })
  });
  return res.json();
}

// ============================
// FACULTY
// ============================
export async function facultyLogin(username, password) {
  const res = await fetch(`${BASE_URL}/api/faculty/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ username, password })
  });
  return res.json();
}

export async function addNoteForStudent(faculty, regno, note, isPrivate=false) {
  const res = await fetch(`${BASE_URL}/api/faculty/add-note`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ faculty, regno, note, isPrivate })
  });
  return res.json();
}

// ============================
// STUDENT
// ============================
export async function studentLogin(regno) {
  const res = await fetch(`${BASE_URL}/api/student/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ regno })
  });
  return res.json();
}

export async function getStudentData(regno) {
  const res = await fetch(`${BASE_URL}/api/student/data?regno=${regno}`);
  return res.json();
}

// ============================
// CHATBOT
// ============================
export async function askChatbot(message) {
  const res = await fetch(`${BASE_URL}/api/chatbot/query`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ message })
  });
  return res.json();
}

// Chatbot triggers CRUD
export async function getChatbotTriggers() {
  const res = await fetch(`${BASE_URL}/api/chatbot/triggers`);
  return res.json();
}

export async function addChatbotTrigger(trigger, response, type='normal') {
  const res = await fetch(`${BASE_URL}/api/chatbot/triggers`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ trigger, response, type })
  });
  return res.json();
}

export async function editChatbotTrigger(id, trigger, response, type) {
  const res = await fetch(`${BASE_URL}/api/chatbot/triggers/${id}`, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ trigger, response, type })
  });
  return res.json();
}

export async function deleteChatbotTrigger(id) {
  const res = await fetch(`${BASE_URL}/api/chatbot/triggers/${id}`, { method: "DELETE" });
  return res.json();
}

// ============================
// MASTER COMMANDS
// ============================
export async function getMasterCommands() {
  const res = await fetch(`${BASE_URL}/api/master-commands`);
  return res.json();
}

export async function addMasterCommand(name, action, permission='all') {
  const res = await fetch(`${BASE_URL}/api/master-commands`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ name, action, permission })
  });
  return res.json();
}

export async function editMasterCommand(id, name, action, permission) {
  const res = await fetch(`${BASE_URL}/api/master-commands/${id}`, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ name, action, permission })
  });
  return res.json();
}

export async function deleteMasterCommand(id) {
  const res = await fetch(`${BASE_URL}/api/master-commands/${id}`, { method: "DELETE" });
  return res.json();
}

export async function executeMasterCommand(id, user) {
  const res = await fetch(`${BASE_URL}/api/master-commands/${id}/execute`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ user })
  });
  return res.json();
}

// ============================
// BADGES
// ============================
export async function getBadges() {
  const res = await fetch(`${BASE_URL}/api/badges`);
  return res.json();
}

export async function createBadge(name, effects=[], access=[]) {
  const res = await fetch(`${BASE_URL}/api/badges`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ name, effects, access })
  });
  return res.json();
}

export async function deleteBadge(id) {
  const res = await fetch(`${BASE_URL}/api/badges/${id}`, { method: "DELETE" });
  return res.json();
}

// Assign badge to user
export async function assignBadge(username, badgeName) {
  const res = await fetch(`${BASE_URL}/api/badges/assign`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ username, badgeName })
  });
  return res.json();
}

// ============================
// NOTICES
// ============================
export async function getNotices() {
  const res = await fetch(`${BASE_URL}/api/notices`);
  return res.json();
}

export async function createNotice(title, message, assignedStudents=[]) {
  const res = await fetch(`${BASE_URL}/api/notices`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ title, message, assignedStudents })
  });
  return res.json();
}

export async function editNotice(id, title, message, assignedStudents=[]) {
  const res = await fetch(`${BASE_URL}/api/notices/${id}`, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ title, message, assignedStudents })
  });
  return res.json();
}

export async function deleteNotice(id) {
  const res = await fetch(`${BASE_URL}/api/notices/${id}`, { method: "DELETE" });
  return res.json();
}

// ============================
// TESTS
// ============================
export async function getTests() {
  const res = await fetch(`${BASE_URL}/api/tests`);
  return res.json();
}

export async function createTest(test) {
  const res = await fetch(`${BASE_URL}/api/tests`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(test)
  });
  return res.json();
}

export async function deleteTest(id) {
  const res = await fetch(`${BASE_URL}/api/tests/${id}`, { method: "DELETE" });
  return res.json();
}

// ============================
// USERS
// ============================
export async function getUsers() {
  const res = await fetch(`${BASE_URL}/api/users`);
  return res.json();
}

export async function addUser(user) {
  const res = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(user)
  });
  return res.json();
}

export async function editUser(username, updates) {
  const res = await fetch(`${BASE_URL}/api/users/${username}`, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(updates)
  });
  return res.json();
}

export async function deleteUser(username) {
  const res = await fetch(`${BASE_URL}/api/users/${username}`, { method: "DELETE" });
  return res.json();
}

// Lock/Unlock user
export async function toggleUserLock(username, lockStatus) {
  const res = await fetch(`${BASE_URL}/api/users/${username}/lock`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ locked: lockStatus })
  });
  return res.json();
}

// ============================
// FEEDBACK
// ============================
export async function sendFeedback(user, feedback) {
  const res = await fetch(`${BASE_URL}/api/feedback`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ user, feedback })
  });
  return res.json();
}

// ============================
// EXAMS / GENERAL
// ============================
export async function getExams() {
  const res = await fetch(`${BASE_URL}/api/exams`);
  return res.json();
      }

// api.js — all API connections for Student Assistant system

// 👇 your Render backend link
const BASE_URL = "https://feathers-26g1.onrender.com";

// ----------------------
// ADMIN
// ----------------------

export async function adminLogin(username, password) {
  const res = await fetch(`${BASE_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function adminSetup(password) {
  const res = await fetch(`${BASE_URL}/admin/setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return res.json();
}

export async function adminForgotPassword(email) {
  const res = await fetch(`${BASE_URL}/admin/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function adminResetPassword(token, newPassword) {
  const res = await fetch(`${BASE_URL}/admin/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  return res.json();
}

// ----------------------
// FACULTY
// ----------------------

export async function facultyLogin(username, password) {
  const res = await fetch(`${BASE_URL}/faculty/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function addNoteForStudent(faculty, regno, note, isPrivate) {
  const res = await fetch(`${BASE_URL}/faculty/add-note`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ faculty, regno, note, isPrivate }),
  });
  return res.json();
}

// ----------------------
// STUDENT
// ----------------------

export async function studentLogin(regno) {
  const res = await fetch(`${BASE_URL}/student/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ regno }),
  });
  return res.json();
}

export async function getStudentData(regno) {
  const res = await fetch(`${BASE_URL}/student/data?regno=${regno}`);
  return res.json();
}

// ----------------------
// CHATBOT
// ----------------------

export async function askChatbot(message) {
  const res = await fetch(`${BASE_URL}/chatbot/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  return res.json();
}

// ----------------------
// GENERAL UTILITIES
// ----------------------

export async function getNotices() {
  const res = await fetch(`${BASE_URL}/notices`);
  return res.json();
}

export async function getExams() {
  const res = await fetch(`${BASE_URL}/exams`);
  return res.json();
}

export async function sendFeedback(user, feedback) {
  const res = await fetch(`${BASE_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, feedback }),
  });
  return res.json();
}
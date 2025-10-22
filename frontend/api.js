// api.js — unified API for Student Assistant system with lock + master command integration
const BASE_URL = "https://feathers-26g1.onrender.com";

// ============================
// AUTH / LOGIN
// ============================
export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user)
  });
  return res.json();
}

export async function editUser(email, updates) {
  const res = await fetch(`${BASE_URL}/api/users/${email}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });
  return res.json();
}

export async function deleteUser(email) {
  const res = await fetch(`${BASE_URL}/api/users/${email}`, { method: "DELETE" });
  return res.json();
}

export async function toggleUserLock(email, lockStatus) {
  const res = await fetch(`${BASE_URL}/api/users/${email}/lock`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locked: lockStatus })
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

export async function createBadge(name, effects = [], access = []) {
  const res = await fetch(`${BASE_URL}/api/badges`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, effects, access })
  });
  return res.json();
}

export async function deleteBadge(id) {
  const res = await fetch(`${BASE_URL}/api/badges/${id}`, { method: "DELETE" });
  return res.json();
}

export async function assignBadge(email, badgeId) {
  const res = await fetch(`${BASE_URL}/api/badges/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, badgeId })
  });
  return res.json();
}

// ============================
// MASTER COMMANDS
// ============================
export async function getMasterCommands() {
  const res = await fetch(`${BASE_URL}/api/master`);
  return res.json();
}

export async function addMasterCommand(name, action, permission = "all") {
  const res = await fetch(`${BASE_URL}/api/master`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, action, permission })
  });
  return res.json();
}

export async function editMasterCommand(id, updates) {
  const res = await fetch(`${BASE_URL}/api/master/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });
  return res.json();
}

export async function deleteMasterCommand(id) {
  const res = await fetch(`${BASE_URL}/api/master/${id}`, { method: "DELETE" });
  return res.json();
}

export async function executeMasterCommand(id, actor = "admin") {
  const res = await fetch(`${BASE_URL}/api/master/${id}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor })
  });
  return res.json();
}

// ============================
// LOCK SYSTEM (NEW)
// ============================
export async function getLockStatus() {
  const res = await fetch(`${BASE_URL}/api/lock`);
  return res.json();
}

export async function updateLockStatus(data) {
  const res = await fetch(`${BASE_URL}/api/lock`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}

// ============================
// CHATBOT TRIGGERS
// ============================
export async function getChatbotTriggers() {
  const res = await fetch(`${BASE_URL}/api/chatbot/triggers`);
  return res.json();
}

export async function addChatbotTrigger(trigger, response, type = "normal") {
  const res = await fetch(`${BASE_URL}/api/chatbot/triggers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trigger, response, type })
  });
  return res.json();
}

export async function editChatbotTrigger(id, updates) {
  const res = await fetch(`${BASE_URL}/api/chatbot/triggers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
  });
  return res.json();
}

export async function deleteChatbotTrigger(id) {
  const res = await fetch(`${BASE_URL}/api/chatbot/triggers/${id}`, { method: "DELETE" });
  return res.json();
}

// ============================
// NOTICES
// ============================
export async function getNotices() {
  const res = await fetch(`${BASE_URL}/api/notices`);
  return res.json();
}

export async function createNotice(notice) {
  const res = await fetch(`${BASE_URL}/api/notices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(notice)
  });
  return res.json();
}

export async function editNotice(id, updates) {
  const res = await fetch(`${BASE_URL}/api/notices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates)
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(test)
  });
  return res.json();
}

export async function deleteTest(id) {
  const res = await fetch(`${BASE_URL}/api/tests/${id}`, { method: "DELETE" });
  return res.json();
}

// ============================
// ATTENDANCE
// ============================
export async function getAttendance() {
  const res = await fetch(`${BASE_URL}/api/attendance`);
  return res.json();
}

export async function addAttendance(entries) {
  const res = await fetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries })
  });
  return res.json();
}

// ============================
// ANALYTICS
// ============================
export async function getAnalytics() {
  const res = await fetch(`${BASE_URL}/api/analytics`);
  return res.json();
}

export async function addAnalytics(event) {
  const res = await fetch(`${BASE_URL}/api/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event)
  });
  return res.json();
}

// ============================
// LOGS
// ============================
export async function getLogs() {
  const res = await fetch(`${BASE_URL}/api/logs`);
  return res.json();
}

export async function addLog(msg, user = "system") {
  const res = await fetch(`${BASE_URL}/api/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msg, user })
  });
  return res.json();
}

// ============================
// CHAT HISTORY
// ============================
export async function getChatHistory() {
  const res = await fetch(`${BASE_URL}/api/chat/history`);
  return res.json();
}

export async function addChatHistory(entry) {
  const res = await fetch(`${BASE_URL}/api/chat/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry)
  });
  return res.json();
}

// ============================
// IMPORT / EXPORT
// ============================
export async function exportAllData() {
  const res = await fetch(`${BASE_URL}/api/export`);
  return res.json();
}

export async function importAllData(data) {
  const res = await fetch(`${BASE_URL}/api/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}

// ============================
// 2FA / Password Reset
// ============================
export async function send2FA(email) {
  const res = await fetch(`${BASE_URL}/api/send-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  return res.json();
}

export async function resetPassword(email, code, newPassword) {
  const res = await fetch(`${BASE_URL}/api/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, newPassword })
  });
  return res.json();
    }

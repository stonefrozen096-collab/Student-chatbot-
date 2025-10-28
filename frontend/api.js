// frontend/js/api.js
// ✅ Unified and production-ready API handler for Student Assistant project
// Includes JWT, Forgot Password, Reset Password, and all existing modules

const base = '/api';

/* ------------------------- AUTH ------------------------- */

// 🔹 Login
export async function login(email, password) {
  const res = await fetch(`${base}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return handle(res);
}

// 🔹 Logout
export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
}

// 🔹 Forgot Password
export async function forgotPassword(email) {
  const res = await fetch(`${base}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return handle(res);
}

// 🔹 Reset Password
export async function resetPassword(token, newPassword) {
  const res = await fetch(`${base}/reset-password/${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword })
  });
  return handle(res);
}

/* ------------------------- HELPERS ------------------------- */

// 🔹 Adds Bearer Token if available
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 🔹 Handles all API responses
async function handle(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      error: json.error || json.message || 'HTTP Error',
      status: res.status,
      data: json
    };
  }
  return json;
}

/* ------------------------- USERS ------------------------- */
export async function getUsers() {
  const res = await fetch(`${base}/users`, { headers: { ...getAuthHeaders() } });
  return handle(res);
}

export async function addUser(user) {
  const res = await fetch(`${base}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(user)
  });
  return handle(res);
}

export async function editUser(email, data) {
  const res = await fetch(`${base}/users/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data)
  });
  return handle(res);
}

export async function deleteUser(email) {
  const res = await fetch(`${base}/users/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  });
  return handle(res);
}

export async function toggleUserLock(email, locked) {
  const res = await fetch(`${base}/users/${encodeURIComponent(email)}/lock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ locked })
  });
  return handle(res);
}

/* ------------------------- BADGES ------------------------- */
export async function getBadges() {
  const res = await fetch(`${base}/badges`, { headers: { ...getAuthHeaders() } });
  return handle(res);
}

export async function createBadge(name, effects = [], access = []) {
  const res = await fetch(`${base}/badges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ name, effects, access })
  });
  return handle(res);
}

export async function removeBadge(id) {
  const res = await fetch(`${base}/badges/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  });
  return handle(res);
}

export async function assignBadge(email, badgeId) {
  const res = await fetch(`${base}/badges/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ email, badgeId })
  });
  return handle(res);
}

/* ------------------------- MASTER COMMANDS ------------------------- */
export async function getMasterCommands() {
  const res = await fetch(`${base}/master`, { headers: { ...getAuthHeaders() } });
  return handle(res);
}

export async function addMasterCommand(name, action, permission = 'all', dangerous = false) {
  const res = await fetch(`${base}/master`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ name, action, permission, dangerous })
  });
  return handle(res);
}

export async function editMasterCommand(id, updates) {
  const res = await fetch(`${base}/master/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(updates)
  });
  return handle(res);
}

export async function deleteMasterCommand(id) {
  const res = await fetch(`${base}/master/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  });
  return handle(res);
}

export async function executeMasterCommand(id, body = {}) {
  const res = await fetch(`${base}/master/${encodeURIComponent(id)}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body)
  });
  return handle(res);
}

/* ------------------------- TESTS ------------------------- */
export async function getTests() {
  const res = await fetch(`${base}/tests`, { headers: { ...getAuthHeaders() } });
  return handle(res);
}

export async function createTest(payload) {
  const res = await fetch(`${base}/tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return handle(res);
}

export async function deleteTest(id) {
  const res = await fetch(`${base}/tests/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  });
  return handle(res);
}

/* ------------------------- ATTENDANCE ------------------------- */
export async function getAttendance() {
  const res = await fetch(`${base}/attendance`, { headers: { ...getAuthHeaders() } });
  return handle(res);
}

export async function saveAttendance(entries) {
  const res = await fetch(`${base}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ entries })
  });
  return handle(res);
}

/* ------------------------- CHATBOT TRIGGERS ------------------------- */
export async function getChatbotTriggers() {
  const res = await fetch(`${base}/chatbot/triggers`, { headers: { ...getAuthHeaders() } });
  return handle(res);
}

export async function addChatbotTrigger(trigger, response, type = 'normal') {
  const res = await fetch(`${base}/chatbot/triggers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ trigger, response, type })
  });
  return handle(res);
}

export async function editChatbotTrigger(id, trigger, response, type) {
  const res = await fetch(`${base}/chatbot/triggers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ trigger, response, type })
  });
  return handle(res);
}

export async function deleteChatbotTrigger(id) {
  const res = await fetch(`${base}/chatbot/triggers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  });
  return handle(res);
}

/* ------------------------- NOTICES ------------------------- */
export async function getNotices() {
  const res = await fetch(`${base}/notices`, { headers: { ...getAuthHeaders() } });
  return handle(res);
}

export async function addNotice(payload) {
  const res = await fetch(`${base}/notices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return handle(res);
}

export async function editNotice(id, payload) {
  const res = await fetch(`${base}/notices/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return handle(res);
}

export async function deleteNotice(id) {
  const res = await fetch(`${base}/notices/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  });
  return handle(res);
}

/* ------------------------- EXPORT ------------------------- */
export default {
  login, logout,
  forgotPassword, resetPassword,
  getUsers, addUser, editUser, deleteUser, toggleUserLock,
  getBadges, createBadge, removeBadge, assignBadge,
  getMasterCommands, addMasterCommand, editMasterCommand, deleteMasterCommand, executeMasterCommand,
  getTests, createTest, deleteTest,
  getAttendance, saveAttendance,
  getChatbotTriggers, addChatbotTrigger, editChatbotTrigger, deleteChatbotTrigger,
  getNotices, addNotice, editNotice, deleteNotice
};

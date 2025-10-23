// ============================
// api.js — Full Unified API for Student Assistant System
// Supports: Auth, Users, Badges, Locks, Master Commands,
// Chatbot, Notices, Tests, Attendance, Analytics, Logs, etc.
// ============================

const BASE_URL = "https://feathers-26g1.onrender.com";

// ------------------------------------------------------
// Helper: Unified API Call with Error Handling & Logging
// ------------------------------------------------------
async function safeFetch(url, options = {}, description = "") {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(`✅ ${description || "API success"}`, data);
    return data;
  } catch (err) {
    console.error(`❌ ${description} failed:`, err);
    showOverlayMessage(`⚠️ ${description} failed`, 2500, "error");
    return { error: err.message };
  }
}

// ------------------------------------------------------
// Helper: Fullscreen Overlay Message
// ------------------------------------------------------
function showOverlayMessage(msg, duration = 3000, type = "info") {
  let overlay = document.getElementById("globalOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "globalOverlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background:
        type === "error"
          ? "rgba(200,0,0,0.85)"
          : type === "success"
          ? "rgba(0,200,0,0.85)"
          : "rgba(0,0,0,0.75)",
      color: "#fff",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontSize: "2rem",
      zIndex: 99999,
      opacity: 0,
      textAlign: "center",
      transition: "opacity 0.5s ease",
    });
    document.body.appendChild(overlay);
  }

  overlay.textContent = msg;
  overlay.style.display = "flex";
  overlay.style.opacity = 1;

  setTimeout(() => {
    overlay.style.opacity = 0;
    setTimeout(() => (overlay.style.display = "none"), 600);
  }, duration);
}

// ============================
// AUTH / LOGIN
// ============================
export async function login(email, password) {
  return safeFetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }, "Login");
}

// ============================
// USERS
// ============================
export async function getUsers() {
  return safeFetch(`${BASE_URL}/api/users`, {}, "Get Users");
}

export async function addUser(user) {
  return safeFetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  }, "Add User");
}

export async function editUser(email, updates) {
  return safeFetch(`${BASE_URL}/api/users/${email}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  }, "Edit User");
}

export async function deleteUser(email) {
  return safeFetch(`${BASE_URL}/api/users/${email}`, { method: "DELETE" }, "Delete User");
}

export async function toggleUserLock(email, lockStatus) {
  const data = await safeFetch(`${BASE_URL}/api/users/${email}/lock`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locked: lockStatus }),
  }, "Toggle User Lock");

  if (!data.error) {
    showOverlayMessage(lockStatus ? "🔒 User Locked" : "🔓 User Unlocked", 2500);
    window.dispatchEvent(new CustomEvent("lockStatusUpdated", { detail: data }));
  }
  return data;
}

// ============================
// BADGES
// ============================
export async function getBadges() {
  return safeFetch(`${BASE_URL}/api/badges`, {}, "Get Badges");
}

export async function createBadge(name, effects = [], access = []) {
  return safeFetch(`${BASE_URL}/api/badges`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, effects, access }),
  }, "Create Badge");
}

export async function deleteBadge(id) {
  return safeFetch(`${BASE_URL}/api/badges/${id}`, { method: "DELETE" }, "Delete Badge");
}

export async function assignBadge(email, badgeId) {
  return safeFetch(`${BASE_URL}/api/badges/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, badgeId }),
  }, "Assign Badge");
}

// ============================
// MASTER COMMANDS
// ============================
export async function getMasterCommands() {
  return safeFetch(`${BASE_URL}/api/master`, {}, "Get Master Commands");
}

export async function addMasterCommand(name, action, permission = "all") {
  const data = await safeFetch(`${BASE_URL}/api/master`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, action, permission }),
  }, "Add Master Command");

  if (!data.error) {
    showOverlayMessage(`✨ Command "${name}" added`, 2500, "success");
    window.dispatchEvent(new CustomEvent("masterCommandAdded", { detail: data }));
  }
  return data;
}

export async function editMasterCommand(id, updates) {
  return safeFetch(`${BASE_URL}/api/master/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  }, "Edit Master Command");
}

export async function deleteMasterCommand(id) {
  const data = await safeFetch(`${BASE_URL}/api/master/${id}`, { method: "DELETE" }, "Delete Master Command");
  if (!data.error) {
    showOverlayMessage("🗑️ Command deleted", 2000, "error");
    window.dispatchEvent(new CustomEvent("masterCommandDeleted", { detail: id }));
  }
  return data;
}

export async function executeMasterCommand(id, actor = "admin") {
  const data = await safeFetch(`${BASE_URL}/api/master/${id}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actor }),
  }, "Execute Master Command");

  if (!data.error) {
    showOverlayMessage(`🚀 Executed: ${data.name || "Command"}`, 3000, "success");
    window.dispatchEvent(new CustomEvent("masterCommandExecuted", { detail: data }));
  }
  return data;
}

// ============================
// LOCK SYSTEM
// ============================
export async function getLockStatus() {
  return safeFetch(`${BASE_URL}/api/lock`, {}, "Get Lock Status");
}

export async function updateLockStatus(data) {
  const res = await safeFetch(`${BASE_URL}/api/lock`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, "Update Lock Status");

  if (!res.error) {
    showOverlayMessage(res.active ? "🔒 Global Lock Enabled" : "🔓 Global Lock Disabled", 2500);
    window.dispatchEvent(new CustomEvent("lockStatusChanged", { detail: res }));
  }

  return res;
}

// ============================
// CHATBOT TRIGGERS
// ============================
export async function getChatbotTriggers() {
  return safeFetch(`${BASE_URL}/api/chatbot/triggers`, {}, "Get Chatbot Triggers");
}

export async function addChatbotTrigger(trigger, response, type = "normal") {
  return safeFetch(`${BASE_URL}/api/chatbot/triggers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trigger, response, type }),
  }, "Add Chatbot Trigger");
}

export async function editChatbotTrigger(id, updates) {
  return safeFetch(`${BASE_URL}/api/chatbot/triggers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  }, "Edit Chatbot Trigger");
}

export async function deleteChatbotTrigger(id) {
  return safeFetch(`${BASE_URL}/api/chatbot/triggers/${id}`, { method: "DELETE" }, "Delete Chatbot Trigger");
}

// ============================
// NOTICES
// ============================
export async function getNotices() {
  return safeFetch(`${BASE_URL}/api/notices`, {}, "Get Notices");
}

export async function createNotice(notice) {
  return safeFetch(`${BASE_URL}/api/notices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(notice),
  }, "Create Notice");
}

export async function editNotice(id, updates) {
  return safeFetch(`${BASE_URL}/api/notices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  }, "Edit Notice");
}

export async function deleteNotice(id) {
  return safeFetch(`${BASE_URL}/api/notices/${id}`, { method: "DELETE" }, "Delete Notice");
}

// ============================
// TESTS
// ============================
export async function getTests() {
  return safeFetch(`${BASE_URL}/api/tests`, {}, "Get Tests");
}

export async function createTest(test) {
  return safeFetch(`${BASE_URL}/api/tests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(test),
  }, "Create Test");
}

export async function deleteTest(id) {
  return safeFetch(`${BASE_URL}/api/tests/${id}`, { method: "DELETE" }, "Delete Test");
}

// ============================
// ATTENDANCE
// ============================
export async function getAttendance() {
  return safeFetch(`${BASE_URL}/api/attendance`, {}, "Get Attendance");
}

export async function addAttendance(entries) {
  return safeFetch(`${BASE_URL}/api/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries }),
  }, "Add Attendance");
}

// ============================
// ANALYTICS
// ============================
export async function getAnalytics() {
  return safeFetch(`${BASE_URL}/api/analytics`, {}, "Get Analytics");
}

export async function addAnalytics(event) {
  return safeFetch(`${BASE_URL}/api/analytics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }, "Add Analytics");
}

// ============================
// LOGS
// ============================
export async function getLogs() {
  return safeFetch(`${BASE_URL}/api/logs`, {}, "Get Logs");
}

export async function addLog(msg, user = "system") {
  return safeFetch(`${BASE_URL}/api/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msg, user }),
  }, "Add Log");
}

// ============================
// CHAT HISTORY
// ============================
export async function getChatHistory() {
  return safeFetch(`${BASE_URL}/api/chat/history`, {}, "Get Chat History");
}

export async function addChatHistory(entry) {
  return safeFetch(`${BASE_URL}/api/chat/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  }, "Add Chat History");
}

// ============================
// IMPORT / EXPORT
// ============================
export async function exportAllData() {
  return safeFetch(`${BASE_URL}/api/export`, {}, "Export Data");
}

export async function importAllData(data) {
  return safeFetch(`${BASE_URL}/api/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, "Import Data");
}

// ============================
// 2FA / PASSWORD RESET
// ============================
export async function send2FA(email) {
  return safeFetch(`${BASE_URL}/api/send-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }, "Send 2FA Code");
}

export async function resetPassword(email, code, newPassword) {
  return safeFetch(`${BASE_URL}/api/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, newPassword }),
  }, "Reset Password");
}

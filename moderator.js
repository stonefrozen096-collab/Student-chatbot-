// moderator.js

// -------------------
// Utility Functions
// -------------------
function showAlert(message, type = "success") {
  const alertBox = document.getElementById("alert-box");
  alertBox.textContent = message;
  alertBox.className = `alert ${type}`;
  setTimeout(() => (alertBox.textContent = ""), 3000);
}

function logout() {
  showAlert("Logging out...", "success");
  setTimeout(() => {
    window.location.href = "../index.html";
  }, 1000);
}

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const mode = document.body.classList.contains("dark-mode") ? "Dark" : "Light";
  showAlert(`${mode} Mode Enabled`, "success");
}

// -------------------
// Fetch Logs
// -------------------
async function loadLogs() {
  try {
    const res = await fetch("http://localhost:3000/moderator/logs");
    if (!res.ok) throw new Error("Failed to fetch logs");
    const logs = await res.json();

    const logsContainer = document.getElementById("logs-container");
    logsContainer.innerHTML = "";

    logs.forEach(log => {
      const div = document.createElement("div");
      div.className = "log-entry";
      div.innerHTML = `<strong>${log.user}</strong>: ${log.action} <em>(${new Date(log.timestamp).toLocaleString()})</em>`;
      logsContainer.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    showAlert("⚠️ Error loading logs", "error");
  }
}

// -------------------
// Suspicious Activity
// -------------------
async function loadSuspiciousActivity() {
  try {
    const res = await fetch("http://localhost:3000/moderator/suspicious");
    if (!res.ok) throw new Error("Failed to fetch suspicious activity");
    const suspicious = await res.json();

    const table = document.getElementById("suspicious-table");
    table.innerHTML = "";

    suspicious.forEach(item => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.user}</td>
        <td>${item.role}</td>
        <td>${item.ip}</td>
        <td>${new Date(item.time).toLocaleString()}</td>
      `;
      table.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    showAlert("⚠️ Error loading suspicious activity", "error");
  }
}

// -------------------
// Messaging with Admin
// -------------------
document.getElementById("messageForm").addEventListener("submit", async e => {
  e.preventDefault();
  const message = document.getElementById("messageText").value;

  try {
    const res = await fetch("http://localhost:3000/moderator/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    if (!res.ok) throw new Error("Failed to send message");
    const data = await res.json();

    showAlert("Message sent to Admin ✅", "success");

    // Append message in chatBox
    const chatBox = document.getElementById("chatBox");
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-message moderator";
    msgDiv.textContent = `You: ${message}`;
    chatBox.appendChild(msgDiv);

    document.getElementById("messageText").value = "";
  } catch (err) {
    console.error(err);
    showAlert("⚠️ Error sending message", "error");
  }
});

async function loadMessages() {
  try {
    const res = await fetch("http://localhost:3000/moderator/messages");
    if (!res.ok) throw new Error("Failed to fetch messages");
    const messages = await res.json();

    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML = "";

    messages.forEach(msg => {
      const div = document.createElement("div");
      div.className = `chat-message ${msg.sender}`;
      div.textContent = `${msg.sender}: ${msg.text}`;
      chatBox.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    showAlert("⚠️ Error loading messages", "error");
  }
}

// -------------------
// Init
// -------------------
window.onload = () => {
  loadLogs();
  loadSuspiciousActivity();
  loadMessages();

  // Refresh logs and messages every 15 seconds
  setInterval(() => {
    loadLogs();
    loadSuspiciousActivity();
    loadMessages();
  }, 15000);
};
// analytics.js — persistent analytics management with real-time updates
import * as api from "./api.js"; // Your unified API

// ----------------------
// Socket.IO connection
// ----------------------
const socket = io(); // assumes <script src="/socket.io/socket.io.js"></script> is included in HTML

// ----------------------
// Analytics Data (frontend cache)
// ----------------------
let analyticsData = {
  totalMessages: 0,
  activeUsers: new Set(),
  lockCount: 0,
  totalLockDuration: 0,
  triggerUsage: {},
  typeCounts: { normal: 0, warning: 0, urgent: 0 },
  messageHistory: []
};

// ----------------------
// Load analytics from server
// ----------------------
export async function loadAnalytics() {
  try {
    const serverData = await api.getAnalytics();
    if (serverData) {
      analyticsData.totalMessages = serverData.totalMessages || 0;
      analyticsData.activeUsers = new Set(serverData.activeUsers || []);
      analyticsData.lockCount = serverData.lockCount || 0;
      analyticsData.totalLockDuration = serverData.totalLockDuration || 0;
      analyticsData.triggerUsage = serverData.triggerUsage || {};
      analyticsData.typeCounts = serverData.typeCounts || { normal: 0, warning: 0, urgent: 0 };
      analyticsData.messageHistory = serverData.messageHistory || [];
    }
    updateAnalyticsUI();
    renderMessageChart();
  } catch (err) {
    console.error("Failed to load analytics:", err);
  }
}

// ----------------------
// Record analytics events
// ----------------------
export async function recordMessage(user, trigger, type = "normal") {
  analyticsData.totalMessages++;
  analyticsData.activeUsers.add(user);
  analyticsData.messageHistory.push({ user, trigger, type, time: new Date().toISOString() });
  analyticsData.triggerUsage[trigger] = (analyticsData.triggerUsage[trigger] || 0) + 1;
  if (analyticsData.typeCounts[type] !== undefined) analyticsData.typeCounts[type]++;
  
  updateAnalyticsUI();
  renderMessageChart();

  try {
    await api.recordAnalytics({ type: "message", user, trigger, messageType: type });
  } catch (err) {
    console.error("Failed to record message analytics:", err);
  }
}

export async function recordLock(durationSeconds) {
  analyticsData.lockCount++;
  analyticsData.totalLockDuration += durationSeconds / 60;

  updateAnalyticsUI();

  try {
    await api.recordAnalytics({ type: "lock", duration: durationSeconds });
  } catch (err) {
    console.error("Failed to record lock analytics:", err);
  }
}

// ----------------------
// Update UI
// ----------------------
function updateAnalyticsUI() {
  document.getElementById("totalMessages").innerText = analyticsData.totalMessages;
  document.getElementById("activeUsers").innerText = analyticsData.activeUsers.size;
  document.getElementById("lockCount").innerText = analyticsData.lockCount;
  document.getElementById("lockDuration").innerText = analyticsData.totalLockDuration.toFixed(1);

  const top = Object.entries(analyticsData.triggerUsage).sort((a, b) => b[1] - a[1])[0];
  document.getElementById("topTrigger").innerText = top ? `${top[0]} (${top[1]})` : "None";

  document.getElementById("urgentCount").innerText = analyticsData.typeCounts.urgent;
  document.getElementById("warningCount").innerText = analyticsData.typeCounts.warning;
  document.getElementById("normalCount").innerText = analyticsData.typeCounts.normal;
}

// ----------------------
// Chart rendering
// ----------------------
let messageChart;
export function renderMessageChart() {
  const ctx = document.getElementById("messagesChart")?.getContext("2d");
  if (!ctx) return;

  const times = analyticsData.messageHistory.map(m => new Date(m.time).toLocaleTimeString());
  const counts = analyticsData.messageHistory.map((_, i) => i + 1);

  if (messageChart) messageChart.destroy();

  messageChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: times,
      datasets: [{
        label: "Messages Over Time",
        data: counts,
        borderColor: "#004aad",
        tension: 0.3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// ----------------------
// Socket.IO real-time updates
// ----------------------
socket.on("analyticsUpdated", (data) => {
  if (!data) return;
  if (data.type === "message") {
    recordMessage(data.user, data.trigger, data.messageType);
  } else if (data.type === "lock") {
    recordLock(data.duration);
  }
});

// ----------------------
// Initialize
// ----------------------
document.addEventListener("DOMContentLoaded", loadAnalytics);

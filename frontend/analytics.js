let analyticsData = {
  totalMessages: 0,
  activeUsers: new Set(),
  lockCount: 0,
  totalLockDuration: 0,
  triggerUsage: {},
  typeCounts: { normal: 0, warning: 0, urgent: 0 },
  messageHistory: []
};

// ✅ Called on page load
function loadAnalytics() {
  updateAnalyticsUI();
  renderMessageChart();
}

// ✅ Record message (called when user or chatbot sends message)
function recordMessage(user, trigger, type = "normal") {
  analyticsData.totalMessages++;
  analyticsData.activeUsers.add(user);
  analyticsData.messageHistory.push({ user, trigger, type, time: new Date().toISOString() });

  // Count trigger usage
  analyticsData.triggerUsage[trigger] = (analyticsData.triggerUsage[trigger] || 0) + 1;

  // Count message types
  if (analyticsData.typeCounts[type] !== undefined) analyticsData.typeCounts[type]++;

  updateAnalyticsUI();
  renderMessageChart();
}

// ✅ Record lock/unlock event
function recordLock(durationSeconds) {
  analyticsData.lockCount++;
  analyticsData.totalLockDuration += durationSeconds / 60; // convert to minutes
  updateAnalyticsUI();
}

// ✅ Update Dashboard UI
function updateAnalyticsUI() {
  document.getElementById("totalMessages").innerText = analyticsData.totalMessages;
  document.getElementById("activeUsers").innerText = analyticsData.activeUsers.size;
  document.getElementById("lockCount").innerText = analyticsData.lockCount;
  document.getElementById("lockDuration").innerText = analyticsData.totalLockDuration.toFixed(1);

  // Determine most used trigger
  const top = Object.entries(analyticsData.triggerUsage).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById("topTrigger").innerText = top ? `${top[0]} (${top[1]})` : "None";

  // Type counts
  document.getElementById("urgentCount").innerText = analyticsData.typeCounts.urgent;
  document.getElementById("warningCount").innerText = analyticsData.typeCounts.warning;
  document.getElementById("normalCount").innerText = analyticsData.typeCounts.normal;
}

// ✅ Chart rendering
let messageChart;
function renderMessageChart() {
  const ctx = document.getElementById("messagesChart").getContext("2d");
  const times = analyticsData.messageHistory.map((m) => new Date(m.time).toLocaleTimeString());
  const counts = analyticsData.messageHistory.map((_, i) => i + 1);

  if (messageChart) messageChart.destroy(); // Prevent duplicate charts
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

// Example simulation (remove when integrated)
document.addEventListener("DOMContentLoaded", () => {
  loadAnalytics();
  // Example data simulation
  recordMessage("UserA", "hello", "normal");
  recordMessage("UserB", "urgent", "urgent");
  recordLock(180);
});

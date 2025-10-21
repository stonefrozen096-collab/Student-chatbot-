// importExport.js — API-based Import/Export with Socket.IO
import { socket } from './socket.js'; // make sure socket.js exports initialized socket

// ---------------- Export All Data ----------------
async function exportAllData() {
  try {
    const [masterRes, chatbotRes, analyticsRes] = await Promise.all([
      fetch('/api/getMasterCommands'),
      fetch('/api/getChatbotTriggers'),
      fetch('/api/getAnalytics')
    ]);

    const masterCommands = masterRes.ok ? await masterRes.json() : [];
    const chatbotTriggers = chatbotRes.ok ? await chatbotRes.json() : [];
    const analyticsData = analyticsRes.ok ? await analyticsRes.json() : [];

    const data = { masterCommands, chatbotTriggers, analyticsData };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "adminData.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    logImportExport("✅ Export completed.");
    socket.emit('analyticsUpdate', { type: 'export', timestamp: Date.now() });
  } catch (err) {
    console.error(err);
    logImportExport("❌ Export failed.");
  }
}

// ---------------- Import All Data ----------------
function importAllData() {
  const fileInput = document.getElementById("importFile");
  if (!fileInput.files.length) return alert("Select a JSON file to import.");

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = async e => {
    try {
      const imported = JSON.parse(e.target.result);

      if (imported.masterCommands) {
        await fetch('/api/saveMasterCommands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(imported.masterCommands)
        });
      }
      if (imported.chatbotTriggers) {
        await fetch('/api/saveChatbotTriggers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(imported.chatbotTriggers)
        });
      }
      if (imported.analyticsData) {
        await fetch('/api/saveAnalytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(imported.analyticsData)
        });
      }

      renderMasterCommands?.();
      renderTriggers?.();
      renderAnalytics?.();

      logImportExport("✅ Import successful.");
      socket.emit('analyticsUpdate', { type: 'import', timestamp: Date.now() });
    } catch (err) {
      console.error(err);
      logImportExport("❌ Import failed. Invalid JSON.");
    }
  };

  reader.readAsText(file);
}

// ---------------- Import/Export Logs ----------------
function logImportExport(msg) {
  const container = document.getElementById("importExportLog");
  if (!container) return;
  const div = document.createElement("div");
  div.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
  container.appendChild(div);
  div.scrollIntoView({ behavior: "smooth" });
}

// ---------------- Event Listeners ----------------
document.getElementById("exportBtn")?.addEventListener("click", exportAllData);
document.getElementById("importBtn")?.addEventListener("click", importAllData);

// ---------------- Socket Listener for Real-time Update ----------------
socket.on('analyticsUpdate', data => {
  logImportExport(`🔄 Real-time update triggered: ${data.type} at ${new Date(data.timestamp).toLocaleTimeString()}`);
});

// importExport.js — JSON-based Import/Export

// ---------------- Export All Data ----------------
async function exportAllData() {
  try {
    // Fetch current data from server (or use in-memory variables)
    const resMaster = await fetch('/data/masterCommands.json');
    const masterCommands = resMaster.ok ? await resMaster.json() : [];
    
    const resChatbot = await fetch('/data/chatbotTriggers.json');
    const chatbotTriggers = resChatbot.ok ? await resChatbot.json() : [];
    
    const resAnalytics = await fetch('/data/analyticsData.json');
    const analyticsData = resAnalytics.ok ? await resAnalytics.json() : [];

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

      // Save imported data to server
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
    } catch (err) {
      console.error(err);
      logImportExport("❌ Import failed. Invalid JSON.");
    }
  };

  reader.readAsText(file);
}

// ---------------- Log Import/Export ----------------
function logImportExport(msg) {
  const logContainer = document.getElementById("importExportLog");
  if (!logContainer) return;

  const div = document.createElement("div");
  div.innerText = `${new Date().toLocaleTimeString()} - ${msg}`;
  logContainer.prepend(div);
}

// ---------------- Initialize ----------------
document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');

  exportBtn?.addEventListener('click', exportAllData);
  importBtn?.addEventListener('click', importAllData);
});

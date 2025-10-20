// Example: Import/Export Management
function exportAllData() {
  const data = {
    masterCommands: masterCommands || [],
    chatbotTriggers: chatbotTriggers || [],
    analyticsData: analyticsData || [], // if exists
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "adminData.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  logImportExport("✅ Export completed.");
}

function importAllData() {
  const fileInput = document.getElementById("importFile");
  if(!fileInput.files.length) return alert("Select a JSON file to import.");
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if(imported.masterCommands) masterCommands = imported.masterCommands;
      if(imported.chatbotTriggers) chatbotTriggers = imported.chatbotTriggers;
      if(imported.analyticsData) analyticsData = imported.analyticsData;
      renderMasterCommands?.();
      renderTriggers?.();
      renderAnalytics?.();
      logImportExport("✅ Import successful.");
    } catch(err) {
      console.error(err);
      logImportExport("❌ Import failed. Invalid JSON.");
    }
  };
  reader.readAsText(file);
}

function logImportExport(msg) {
  const log = document.getElementById("importExportLog");
  if(!log) return;
  const div = document.createElement("div");
  div.innerText = `${new Date().toLocaleTimeString()} - ${msg}`;
  log.prepend(div);
}

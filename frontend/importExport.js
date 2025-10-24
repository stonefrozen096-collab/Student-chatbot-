import * as api from './api.js';
const socket = io();

async function exportData() {
  try {
    const data = await api.fetchAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `export_${Date.now()}.json`;
    a.click();
    showNotification('✅ Data exported successfully!', 'success');
  } catch (err) {
    console.error(err);
    showNotification('❌ Failed to export data!', 'error');
  }
}

async function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const json = JSON.parse(e.target.result);
      await api.importAllData(json);
      showNotification('✅ Data imported successfully!', 'success');
      socket.emit('data:imported', json);
    } catch {
      showNotification('❌ Failed to import data!', 'error');
    }
  };
  reader.readAsText(file);
}

// -------------------- Notifications --------------------
function showNotification(msg, type='info'){
  const notif = document.createElement('div');
  notif.className = `floatingNotification ${type}`;
  notif.innerText = msg;
  document.getElementById('floatingContainer').appendChild(notif);
  setTimeout(()=>notif.remove(),3000);
}

// -------------------- Event Listeners --------------------
document.getElementById('exportBtn')?.addEventListener('click', exportData);
document.getElementById('importBtn')?.addEventListener('change', e => importData(e.target.files[0]));

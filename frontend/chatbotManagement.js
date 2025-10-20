// ---------- Chatbot Management (API Version) ----------

let chatbotTriggers = [];
let chatbotWarnings = {};
let chatbotLocked = false;
let chatbotUnlockTime = null;
let chatbotCountdown = null;

// Preloaded triggers (default fallback)
const preTriggers = [
  { trigger: 'hello', response: 'Hi! How can I help you?', type: 'normal' },
  { trigger: 'urgent', response: 'Attention! This is an urgent alert!', type: 'alert' },
];

// ---------------- Load from API ----------------
async function loadChatbotData() {
  try {
    chatbotTriggers = await getChatbotTriggers(); // API call
    chatbotWarnings = {}; // Warnings can be maintained locally or via API if needed
  } catch (e) {
    console.error('Failed to load triggers from API', e);
    chatbotTriggers = [...preTriggers];
  }

  renderTriggers();
}

// ---------------- Render Triggers ----------------
function renderTriggers() {
  const container = document.getElementById('triggerList');
  if (!container) return;
  container.innerHTML = '';

  if (chatbotTriggers.length === 0) {
    const ph = document.createElement('div');
    ph.className = 'placeholder';
    ph.innerText = 'No triggers yet.';
    container.appendChild(ph);
    return;
  }

  chatbotTriggers.forEach((tr) => {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${tr.trigger}</strong> → ${tr.response} | Type: ${tr.type}
      <button class="btn tiny btn-ghost" onclick="editTriggerAPI('${tr.id}')">Edit</button>
      <button class="btn tiny btn-danger" onclick="deleteTriggerAPI('${tr.id}')">Delete</button>`;
    container.appendChild(div);
    setTimeout(() => div.classList.add('fadeIn'), 50);
  });
}

// ---------------- Add/Edit/Delete via API ----------------
async function promptAddTrigger() {
  const trigger = prompt('Trigger keyword');
  if (!trigger) return;
  const response = prompt('Response message');
  if (!response) return;
  const type = prompt('Type: normal / alert / urgent / warning', 'normal');
  await addTriggerAPI(trigger, response, type);
}

async function addTriggerAPI(trigger, response, type = 'normal') {
  try {
    const newTrigger = await addChatbotTrigger(trigger, response, type); // API call
    chatbotTriggers.push(newTrigger);
    renderTriggers();
  } catch (err) {
    console.error('Failed to add trigger', err);
    alert('Failed to add trigger!');
  }
}

async function editTriggerAPI(id) {
  const tr = chatbotTriggers.find(t => t.id === id);
  if (!tr) return;
  const t = prompt('Trigger', tr.trigger); if (t !== null) tr.trigger = t;
  const r = prompt('Response', tr.response); if (r !== null) tr.response = r;
  const ty = prompt('Type', tr.type); if (ty !== null) tr.type = ty;

  try {
    const updated = await editChatbotTrigger(id, tr.trigger, tr.response, tr.type); // API call
    const index = chatbotTriggers.findIndex(x => x.id === id);
    chatbotTriggers[index] = updated;
    renderTriggers();
  } catch (err) {
    console.error('Failed to edit trigger', err);
    alert('Failed to edit trigger!');
  }
}

async function deleteTriggerAPI(id) {
  if (!confirm('Delete this trigger?')) return;
  try {
    await deleteChatbotTrigger(id); // API call
    chatbotTriggers = chatbotTriggers.filter(t => t.id !== id);
    renderTriggers();
  } catch (err) {
    console.error('Failed to delete trigger', err);
    alert('Failed to delete trigger!');
  }
}

// ---------------- Lock / Unlock Chatbot ----------------
function lockChatbot(seconds, msg = 'Chatbot Locked!') {
  chatbotLocked = true;
  chatbotUnlockTime = Date.now() + seconds * 1000;
  const overlay = document.getElementById('chatbotOverlay');
  overlay.style.display = 'flex';
  document.getElementById('chatbotMessage').innerText = msg;

  if (chatbotCountdown) clearInterval(chatbotCountdown);
  chatbotCountdown = setInterval(() => {
    const remaining = Math.ceil((chatbotUnlockTime - Date.now()) / 1000);
    if (remaining <= 0) unlockChatbot();
    else document.getElementById('chatbotMessage').innerText = `${msg} (Unlock in ${remaining}s)`;
  }, 1000);
}

function unlockChatbot() {
  chatbotLocked = false;
  chatbotUnlockTime = null;
  const overlay = document.getElementById('chatbotOverlay');
  overlay.style.display = 'none';
  if (chatbotCountdown) clearInterval(chatbotCountdown);
}

// ---------------- Handle Student Message ----------------
async function studentSendMessage(msg, username = 'student') {
  if (chatbotLocked) return alert('Chatbot is temporarily locked!');

  const tr = chatbotTriggers.find(t => msg.toLowerCase().includes(t.trigger.toLowerCase()));
  if (tr) {
    if (['alert', 'urgent', 'warning'].includes(tr.type)) {
      lockChatbot(10, tr.response);
      chatbotWarnings[username] = (chatbotWarnings[username] || 0) + 1;
      // Optional: call API to log warning
    } else {
      alert(tr.response);
    }
  } else {
    alert('Chatbot: Sorry, I do not understand.');
  }
}

// ---------------- Initialize ----------------
document.addEventListener('DOMContentLoaded', loadChatbotData);

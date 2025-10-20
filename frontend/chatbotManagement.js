// chatbotManagement.js — JSON-based storage

let chatbotTriggers = [];
let chatbotWarnings = {};
let chatbotLocked = false;
let chatbotUnlockTime = null;
let chatbotCountdown = null;

// Preloaded triggers (default)
const preTriggers = [
  { trigger: 'hello', response: 'Hi! How can I help you?', type: 'normal' },
  { trigger: 'urgent', response: 'Attention! This is an urgent alert!', type: 'alert' },
];

// ---------------- Load from JSON ----------------
async function loadChatbotData() {
  try {
    const res = await fetch('/data/chatbotTriggers.json'); // replace with server path
    if (!res.ok) throw 'Failed to fetch chatbotTriggers.json';
    chatbotTriggers = await res.json();
  } catch (e) {
    console.error('Failed to load triggers JSON', e);
    chatbotTriggers = [...preTriggers];
  }

  try {
    const resWarn = await fetch('/data/chatbotWarnings.json'); // replace with server path
    if (!resWarn.ok) throw 'Failed to fetch chatbotWarnings.json';
    chatbotWarnings = await resWarn.json();
  } catch (e) {
    console.error('Failed to load warnings JSON', e);
    chatbotWarnings = {};
  }

  renderTriggers();
}

// ---------------- Save to JSON (simulate server save) ----------------
async function saveChatbotData() {
  try {
    await fetch('/api/saveChatbot', { // replace with your server endpoint
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggers: chatbotTriggers, warnings: chatbotWarnings })
    });
    console.log('Chatbot data saved to server.');
  } catch (e) {
    console.error('Failed to save chatbot data', e);
  }
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

  chatbotTriggers.forEach((tr, i) => {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${tr.trigger}</strong> → ${tr.response} | Type: ${tr.type}
      <button class="btn tiny btn-ghost" onclick="editTrigger(${i})">Edit</button>
      <button class="btn tiny btn-danger" onclick="deleteTrigger(${i})">Delete</button>`;
    container.appendChild(div);
    setTimeout(() => div.classList.add('fadeIn'), 50);
  });
}

// ---------------- Add/Edit/Delete Trigger ----------------
function promptAddTrigger() {
  const trigger = prompt('Trigger keyword');
  if (!trigger) return;
  const response = prompt('Response message');
  if (!response) return;
  const type = prompt('Type: normal / alert / urgent / warning', 'normal');
  addTrigger(trigger, response, type);
}

function addTrigger(trigger, response, type = 'normal') {
  chatbotTriggers.push({ trigger, response, type });
  saveChatbotData();
  renderTriggers();
}

function editTrigger(index) {
  const tr = chatbotTriggers[index];
  if (!tr) return;
  const t = prompt('Trigger', tr.trigger); if (t !== null) tr.trigger = t;
  const r = prompt('Response', tr.response); if (r !== null) tr.response = r;
  const ty = prompt('Type', tr.type); if (ty !== null) tr.type = ty;
  saveChatbotData();
  renderTriggers();
}

function deleteTrigger(index) {
  if (!confirm('Delete this trigger?')) return;
  chatbotTriggers.splice(index, 1);
  saveChatbotData();
  renderTriggers();
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
    if (remaining <= 0) {
      unlockChatbot();
    } else {
      document.getElementById('chatbotMessage').innerText = `${msg} (Unlock in ${remaining}s)`;
    }
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
function studentSendMessage(msg, username = 'student') {
  if (chatbotLocked) return alert('Chatbot is temporarily locked!');

  const tr = chatbotTriggers.find(t => msg.toLowerCase().includes(t.trigger.toLowerCase()));
  if (tr) {
    if (['alert', 'urgent', 'warning'].includes(tr.type)) {
      lockChatbot(10, tr.response); // auto-lock for urgent triggers
      chatbotWarnings[username] = (chatbotWarnings[username] || 0) + 1;
      saveChatbotData();
    } else {
      alert(tr.response);
    }
  } else {
    alert('Chatbot: Sorry, I do not understand.');
  }
}

// ---------------- Initialize ----------------
document.addEventListener('DOMContentLoaded', loadChatbotData);

let masterCommands = [];
let warnings = {};
let globalLock = { active: false, permanent: false, unlockTime: null };

// ====== Load commands from JSON ======
async function loadMasterCommands() {
  try {
    const res = await fetch('data/masterCommands.json'); // JSON file path
    if (!res.ok) throw 'Failed to fetch masterCommands.json';
    masterCommands = await res.json();
    renderMasterCommands();
  } catch (err) {
    console.error(err);
    alert('Error loading master commands.');
  }
}

// ====== Render Master Commands ======
function renderMasterCommands() {
  const container = document.getElementById('masterList');
  if(!container) return;
  container.innerHTML = '';

  masterCommands.forEach((cmd, i) => {
    const div = document.createElement('div');
    div.style.padding = '6px';
    div.style.borderBottom = '1px solid rgba(0,0,0,0.05)';
    div.innerHTML = `
      <strong>${cmd.name}</strong> | Permission: ${cmd.permission || 'all'}
      <button class="btn tiny btn-ghost" onclick="editMaster(${i})">Edit</button>
      <button class="btn tiny btn-danger" onclick="deleteMaster(${i})">Delete</button>
      <button class="btn tiny btn-primary" onclick="executeMaster(${i})">Execute</button>
    `;
    container.appendChild(div);
  });
}

// ====== Admin Adds New Command ======
function addMasterCommand(name, action, permission='all') {
  masterCommands.push({ name, action, permission });
  saveCommands();
  renderMasterCommands();
}

// ====== Edit / Delete ======
function editMaster(index) {
  const cmd = masterCommands[index];
  if(!cmd) return;
  const newName = prompt('Command Name', cmd.name); if(newName!==null) cmd.name=newName;
  const newAction = prompt('JS Action', cmd.action); if(newAction!==null) cmd.action=newAction;
  const newPerm = prompt('Permission (all/admin/badge)', cmd.permission || 'all'); if(newPerm!==null) cmd.permission=newPerm;
  saveCommands(); renderMasterCommands();
}

function deleteMaster(index) {
  if(confirm('Delete this command?')) {
    masterCommands.splice(index,1);
    saveCommands(); renderMasterCommands();
  }
}

// ====== Save to JSON (simulate, in real use API) ======
function saveCommands() {
  // In real scenario, send to server/API to update masterCommands.json
  console.log('Master commands saved (simulate).');
}

// ====== Execute Command ======
function executeMaster(index, user={username:'admin', badges:[]}) {
  const cmd = masterCommands[index];
  if(!cmd) return alert('Command not found.');

  // Permission check
  if(cmd.permission !== 'all' && !user.badges.includes(cmd.permission)) {
    warnings[user.username] = (warnings[user.username] || 0) + 1;
    alert(`Access denied! Warning ${warnings[user.username]}/5`);
    if(warnings[user.username] >= 6) lockUserTemporarily(user.username, warnings[user.username]*10);
    return;
  }

  try {
    eval(cmd.action);
    addLog(`Executed Master Command: ${cmd.name} by ${user.username}`);
  } catch(e) {
    console.error('Execution failed:', e);
    alert('Command execution failed.');
  }
}

// ====== Locks ======
function lockUserTemporarily(username, seconds) {
  const userLock = { active:true, unlockTime: Date.now()+seconds*1000 };
  localStorage.setItem(`userLock_${username}`, JSON.stringify(userLock));
  alert(`User ${username} locked for ${seconds} seconds!`);
}

function lockAllUsers(durationSeconds=60, permanent=false) {
  globalLock.active = true;
  globalLock.permanent = permanent;
  globalLock.unlockTime = permanent ? null : Date.now()+durationSeconds*1000;
  renderGlobalLockOverlay(durationSeconds, permanent);

  if(!permanent) {
    setTimeout(() => {
      globalLock.active=false;
      globalLock.unlockTime=null;
      removeGlobalLockOverlay();
    }, durationSeconds*1000);
  }
}

function unlockAllUsers() {
  globalLock.active=false;
  globalLock.permanent=false;
  globalLock.unlockTime=null;
  removeGlobalLockOverlay();
  alert('✅ All users unlocked.');
}

// ====== Overlay ======
function renderGlobalLockOverlay(duration, permanent) {
  const overlay = document.createElement('div');
  overlay.id='globalLockOverlay';
  overlay.style.position='fixed';
  overlay.style.top=0; overlay.style.left=0; overlay.style.width='100%';
  overlay.style.height='100%'; overlay.style.background='rgba(0,0,0,0.7)';
  overlay.style.zIndex=9999; overlay.style.display='flex';
  overlay.style.alignItems='center'; overlay.style.justifyContent='center';
  overlay.style.flexDirection='column'; overlay.style.color='white';
  overlay.style.fontSize='2em';
  overlay.innerHTML=`🔒 All Users Locked ${permanent?'(Permanent)':'Unlock in '+duration+' sec'}`;
  document.body.appendChild(overlay);
}

function removeGlobalLockOverlay() {
  const overlay = document.getElementById('globalLockOverlay');
  if(overlay) overlay.remove();
}

// ====== Logging ======
function addLog(msg) {
  const logs = JSON.parse(localStorage.getItem('logs')||'[]');
  logs.unshift({msg, time:new Date().toLocaleString()});
  localStorage.setItem('logs', JSON.stringify(logs));
}

// ====== Example Preloaded Commands (JSON) ======
if(masterCommands.length===0){
  addMasterCommand('Lock All (Permanent)', 'lockAllUsers(0,true)','admin');
  addMasterCommand('Lock All (Temporary 60s)', 'lockAllUsers(60,false)','admin');
  addMasterCommand('Unlock All','unlockAllUsers()','admin');
  addMasterCommand('Delete Last Test','deleteTestForMaster(lastTestId)','admin');
  addMasterCommand('Restore Last Deleted Test','restoreLastDeletedTest()','admin');
  addMasterCommand('Warn User','warnUserPrompt()','admin');
  addMasterCommand('Grant Badge','grantBadgePrompt()','admin');
  addMasterCommand('Revoke Badge','revokeBadgePrompt()','admin');
  addMasterCommand('Broadcast Message','broadcastMessagePrompt()','admin');
  addMasterCommand('Freeze User Temporarily','freezeUserPrompt()','admin');
}

// ====== Example Prompt Functions ======
function warnUserPrompt() {
  const u = prompt('Username to warn');
  const msg = prompt('Warning message');
  if(u) alert(`User ${u} warned: ${msg}`);
}
function grantBadgePrompt() {
  const u = prompt('Username');
  const b = prompt('Badge name');
  if(u && b) alert(`User ${u} granted badge ${b}`);
}
function revokeBadgePrompt() {
  const u = prompt('Username');
  const b = prompt('Badge name');
  if(u && b) alert(`User ${u} revoked badge ${b}`);
}
function broadcastMessagePrompt() {
  const msg = prompt('Message to broadcast');
  if(msg) alert(`Message broadcasted: ${msg}`);
}
function freezeUserPrompt() {
  const u = prompt('Username');
  const s = prompt('Duration in seconds');
  if(u && s) lockUserTemporarily(u, parseInt(s));
}

// ====== Initial Load ======
document.addEventListener('DOMContentLoaded', loadMasterCommands);

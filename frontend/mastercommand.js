/* ---------- MASTER COMMAND SYSTEM ---------- */
const masterCommands = JSON.parse(localStorage.getItem('masterCommands') || '[]');
const warnings = JSON.parse(localStorage.getItem('masterWarnings') || '{}'); // { username: count }
let globalLock = { active: false, unlockTime: null };

function saveMasterCommands() {
  localStorage.setItem('masterCommands', JSON.stringify(masterCommands));
}

function renderMasterCommands() {
  const c = document.getElementById('masterList');
  if(!c) return;
  c.innerHTML = '';
  masterCommands.forEach((cmd, i) => {
    const div = document.createElement('div');
    div.style.padding = '6px';
    div.style.borderBottom = '1px solid rgba(255,255,255,0.02)';
    div.innerHTML = `<strong>${cmd.name}</strong> | Permission: ${cmd.permission || 'all'}
      <button class="btn tiny btn-ghost" onclick="editMaster(${i})">Edit</button>
      <button class="btn tiny btn-danger" onclick="deleteMaster(${i})">Delete</button>
      <button class="btn tiny btn-primary" onclick="executeMaster(${i})">Execute</button>`;
    c.appendChild(div);
  });
}

function addMasterCommand(name, action, permission = 'all') {
  masterCommands.push({ name, action, permission });
  saveMasterCommands();
  renderMasterCommands();
}

function editMaster(index) {
  const cmd = masterCommands[index];
  if(!cmd) return;
  const newName = prompt('Command Name', cmd.name); if(newName!==null) cmd.name=newName;
  const newAction = prompt('JS Action', cmd.action); if(newAction!==null) cmd.action=newAction;
  const newPerm = prompt('Permission (all or badge name)', cmd.permission || 'all'); 
  if(newPerm!==null) cmd.permission=newPerm;
  saveMasterCommands(); renderMasterCommands();
}

function deleteMaster(index) {
  if(!confirm('Delete this command?')) return;
  masterCommands.splice(index,1);
  saveMasterCommands(); renderMasterCommands();
}

/* ---------- EXECUTION LOGIC ---------- */
function executeMaster(index, user = {username:'admin', badges:[]}) {
  const cmd = masterCommands[index];
  if(!cmd) return alert('Command not found');

  // check special access
  if(cmd.permission !== 'all' && !user.badges.includes(cmd.permission)) {
    // warning system
    warnings[user.username] = (warnings[user.username] || 0) + 1;
    localStorage.setItem('masterWarnings', JSON.stringify(warnings));

    const attempts = warnings[user.username];
    alert(`Access denied! Warning ${attempts}/5`);
    if(attempts >= 6) {
      lockUserTemporarily(user.username, attempts * 10); // locks increase with misuse
    }
    return;
  }

  try {
    // Execute the action
    eval(cmd.action);
    addLog(`Executed master command: ${cmd.name} by ${user.username}`);
    // For global commands like lockAll
    if(cmd.name.toLowerCase().includes('lockall')) lockAllUsers(60); // example 60 sec
  } catch(e) {
    console.error('Master command execution failed:', e);
  }
}

/* ---------- WARNINGS AND TEMP LOCK ---------- */
function lockUserTemporarily(username, seconds) {
  addLog(`${username} locked for ${seconds} seconds due to misuse`);
  const userLock = { active:true, unlockTime: Date.now() + seconds*1000 };
  localStorage.setItem(`userLock_${username}`, JSON.stringify(userLock));
  // show animation or alert
  alert(`User ${username} is temporarily locked for ${seconds} seconds!`);
}

/* ---------- LOCK ALL USERS ---------- */
function lockAllUsers(durationSeconds = 30) {
  globalLock.active = true;
  globalLock.unlockTime = Date.now() + durationSeconds*1000;
  renderGlobalLockAnimation(durationSeconds);
  setTimeout(() => {
    globalLock.active = false;
    globalLock.unlockTime = null;
    removeGlobalLockAnimation();
  }, durationSeconds*1000);
}

function renderGlobalLockAnimation(duration) {
  const overlay = document.createElement('div');
  overlay.id='globalLockOverlay';
  overlay.style.position='fixed';
  overlay.style.top=0; overlay.style.left=0; overlay.style.width='100%';
  overlay.style.height='100%'; overlay.style.background='rgba(0,0,0,0.7)';
  overlay.style.zIndex=9999; overlay.style.display='flex';
  overlay.style.alignItems='center'; overlay.style.justifyContent='center';
  overlay.style.flexDirection='column'; overlay.style.color='white';
  overlay.style.fontSize='2em';
  overlay.innerHTML=`🔒 All Users Locked<br>Unlock in ${duration} sec`;
  document.body.appendChild(overlay);
}

function removeGlobalLockAnimation() {
  const overlay = document.getElementById('globalLockOverlay');
  if(overlay) overlay.remove();
}

/* ---------- EXAMPLE PRELOADED COMMANDS ---------- */
if(masterCommands.length === 0){
  addMasterCommand('Lock All', 'lockAllUsers(60)', 'admin');
  addMasterCommand('Delete Last Test', 'state.createdTests.pop(); renderCreatedTests();', 'admin');
  addMasterCommand('Restore Last Deleted Test', 'restoreLastDeletedTest();', 'admin');
}

/* ---------- RESTORE FUNCTION EXAMPLE ---------- */
let lastDeletedTest = null;
function deleteTestForMaster(id){
  const index = state.createdTests.findIndex(t=>t.id===id);
  if(index===-1) return;
  lastDeletedTest = state.createdTests.splice(index,1)[0];
  renderCreatedTests();
}
function restoreLastDeletedTest(){
  if(lastDeletedTest) {
    state.createdTests.push(lastDeletedTest);
    renderCreatedTests();
    lastDeletedTest = null;
  }
}

/* ---------- LOG FUNCTION ---------- */
function addLog(msg){
  const logs = JSON.parse(localStorage.getItem('logs')||'[]');
  logs.unshift({msg,time:new Date().toLocaleString()});
  localStorage.setItem('logs', JSON.stringify(logs));
    }

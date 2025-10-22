import { getMasterCommands, addMasterCommand, editMasterCommand, deleteMasterCommand, fetchLogs, saveLogs, getUsers } from './api.js';
const socket = io();

// Logged-in admin (load from JSON)
let loggedInUser = null;
let masterCommands = [];
let preCommands = [
  {name:'Lock All Temporary', action:'lockAllUsersPrompt()', permission:'admin'},
  {name:'Lock All Permanent', action:'lockAllUsers(0,true)', permission:'admin'},
  {name:'Delete Last Test', action:'state.createdTests.pop(); renderCreatedTests();', permission:'admin'},
  {name:'Restore Last Deleted Test', action:'restoreLastDeletedTest();', permission:'admin'},
  {name:'Global Broadcast', action:'showGlobalMessage("This is a broadcast!")', permission:'admin'},
  {name:'Highlight Message', action:'alert("Highlight executed!")', permission:'all'},
  {name:'Sample Test Command', action:'console.log("Sample Test Run")', permission:'all'}
];

// ---------- Load logged-in user ----------
export async function loadLoggedInUser(email) {
  const users = await getUsers();
  loggedInUser = Object.values(users).find(u => u.email === email);
  if(!loggedInUser) alert('Admin not found!');
}

// ---------- Load Master Commands ----------
export async function loadMasterCommands() {
  try { 
    masterCommands = await getMasterCommands(); 
  } catch(e) { 
    console.error('Failed to load master commands', e); 
    masterCommands = [...preCommands]; 
  }

  // If no commands, use preCommands
  if(masterCommands.length === 0) masterCommands = [...preCommands];
  renderMasterCommands();
}

// ---------- Render Master Commands ----------
export function renderMasterCommands() {
  const container = document.getElementById('masterList'); 
  container.innerHTML = '';

  masterCommands.forEach(cmd => {
    const div = document.createElement('div');
    div.className = 'commandItem';
    div.innerHTML = `
      <span>${cmd.name}</span>
      <div>
        <button onclick="executeMasterById('${cmd.id}', loggedInUser)">Execute</button>
        <button onclick="editMasterAPI('${cmd.id}')">Edit</button>
        <button onclick="deleteMasterAPI('${cmd.id}')">Delete</button>
      </div>`;
    container.appendChild(div);
  });
}

// ---------- Execute Command ----------
export async function executeMasterById(id, user) {
  const cmd = masterCommands.find(c => c.id===id);
  if(!cmd) return alert('Command not found');

  const hasPermission = user.role==='admin' || 
                        cmd.permission==='all' || 
                        (cmd.permission==='badge' && user.badges?.length) || 
                        user.specialAccess?.includes(cmd.permission);

  if(!hasPermission) return alert('Access denied!');

  try { eval(cmd.action); addLog(`Executed ${cmd.name} by ${user.username}`); } 
  catch(e) { console.error('Command execution failed', e); }
}

// ---------- Add/Edit/Delete Commands ----------
export async function addNewCommand() {
  const name = prompt('Command Name');
  if(!name) return;
  const action = prompt('JS Action');
  if(!action) return;
  const permission = prompt('Permission (all, badge, special access)', 'all');
  const newCmd = await addMasterCommand(name, action, permission);
  masterCommands.push(newCmd);
  renderMasterCommands();
  socket.emit('masterCommandAdded', newCmd);
}

export async function editMasterAPI(id) {
  const cmd = masterCommands.find(c=>c.id===id); if(!cmd) return;
  const n = prompt('Command Name', cmd.name); if(n!==null) cmd.name=n;
  const a = prompt('JS Action', cmd.action); if(a!==null) cmd.action=a;
  const p = prompt('Permission', cmd.permission||'all'); if(p!==null) cmd.permission=p;
  await editMasterCommand(id, cmd.name, cmd.action, cmd.permission);
  renderMasterCommands();
  socket.emit('masterCommandEdited', cmd);
}

export async function deleteMasterAPI(id) {
  if(!confirm('Delete this command?')) return;
  await deleteMasterCommand(id);
  masterCommands = masterCommands.filter(c=>c.id!==id);
  renderMasterCommands();
  socket.emit('masterCommandDeleted', id);
}

// ---------- Global Lock ----------
let globalLock = {active:false, unlockTime:null};
let countdownInterval = null;

export function lockAllUsersPrompt() {
  const durations={'1 min':60,'2 min':120,'5 min':300}; 
  let choice = prompt('Enter lock duration: 1 min / 2 min / 5 min','1 min'); 
  let sec = durations[choice] || 60; 
  lockAllUsers(sec,false); 
}

export function lockAllUsers(sec=30, permanent=false) {
  globalLock.active=true; 
  globalLock.unlockTime=Date.now()+sec*1000;
  renderGlobalLockAnimation(sec, permanent);
  if(!permanent){
    if(countdownInterval) clearInterval(countdownInterval);
    countdownInterval=setInterval(updateCountdown,1000);
    setTimeout(()=>{ globalLock.active=false; globalLock.unlockTime=null; removeGlobalLockAnimation(); clearInterval(countdownInterval); }, sec*1000);
  }
}

function renderGlobalLockAnimation(sec, permanent=false) {
  const overlay=document.getElementById('globalLockOverlay'); overlay.style.display='flex';
  document.getElementById('lockMessage').innerHTML = permanent ? '🔒 All Users Locked Permanently' : '🔒 All Users Locked';
  document.getElementById('countdownTimer').innerText = permanent ? '' : `Unlock in ${sec} sec`;
}

function updateCountdown() {
  const remaining=Math.ceil((globalLock.unlockTime-Date.now())/1000);
  document.getElementById('countdownTimer').innerText = remaining>0 ? `Unlock in ${remaining} sec` : '';
}

function removeGlobalLockAnimation(){ 
  const overlay=document.getElementById('globalLockOverlay'); overlay.style.display='none';
  document.getElementById('countdownTimer').innerText='';
}

// ---------- Logging ----------
async function addLog(msg) {
  try {
    const logs = await fetchLogs();
    logs.unshift({msg,time:new Date().toLocaleString()});
    await saveLogs(logs);
  } catch(e){ console.error('Failed to log message', e); }
}

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', async () => {
  const section = document.getElementById('masterCommandSection');
  if(!section) return;

  await loadLoggedInUser('sunshinesbright004@gmail.com');
  if(loggedInUser.role === 'admin'){
    section.style.display = 'block';
    await loadMasterCommands();
    removeGlobalLockAnimation();
  }

  document.getElementById('createCommandBtn').addEventListener('click', addNewCommand);
  document.getElementById('lockUsersBtn').addEventListener('click', lockAllUsersPrompt);

  const commandInput = document.getElementById('masterCommandInput');
  commandInput.addEventListener('keypress', e => {
    if(e.key==='Enter'){
      const cmdName = commandInput.value.trim();
      if(!cmdName) return;
      const cmd = masterCommands.find(c => c.name.toLowerCase() === cmdName.toLowerCase());
      if(!cmd) return alert('Command not found');
      executeMasterById(cmd.id, loggedInUser);
      commandInput.value = '';
    }
  });
});

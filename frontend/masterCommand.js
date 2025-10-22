// ----------------------
// MASTER COMMAND SYSTEM JS
// ----------------------
import { getMasterCommands, addMasterCommand, editMasterCommand, deleteMasterCommand, fetchLogs, saveLogs } from './api.js';

const socket = io();

let masterCommands = [];
let warnings = {};
let globalLock = { active:false, unlockTime:null };
let countdownInterval = null;
let loggedInUser = JSON.parse(localStorage.getItem('user')) || { username:'guest', role:'student', badges:[], specialAccess:[] };

// Preloaded fallback commands
const preCommands = [
  {name:'Lock All Temporary', action:'lockAllUsersPrompt()', permission:'admin'},
  {name:'Lock All Permanent', action:'lockAllUsers(0,true)', permission:'admin'},
  {name:'Delete Last Test', action:'deleteLastTestPrompt()', permission:'admin'},
  {name:'Restore Last Deleted Test', action:'restoreLastDeletedTest()', permission:'admin'},
  {name:'Global Broadcast', action:'showGlobalMessage("This is a broadcast!")', permission:'admin'},
  {name:'Highlight Message', action:'alert("Highlight executed!")', permission:'all'},
  {name:'Sample Test Command', action:'console.log("Sample Test Run")', permission:'all'}
];

// ----------------------
// LOAD COMMANDS
// ----------------------
export async function loadMasterCommands(){
  try{
    masterCommands = await getMasterCommands();
    if(!masterCommands.length) masterCommands = [...preCommands];
  } catch(e){
    console.error('Failed to load commands', e);
    masterCommands = [...preCommands];
  }
  renderMasterCommands();
}

// Socket.IO real-time updates
socket.on('masterCommandAdded', cmd => { masterCommands.push(cmd); renderMasterCommands(); });
socket.on('masterCommandEdited', cmd => { 
  const idx = masterCommands.findIndex(c => c.id === cmd.id);
  if(idx>=0) masterCommands[idx] = cmd; 
  renderMasterCommands(); 
});
socket.on('masterCommandDeleted', id => { 
  masterCommands = masterCommands.filter(c => c.id !== id); 
  renderMasterCommands(); 
});
socket.on('masterCommandExecuted', data => { console.log(`Command ${data.id} executed by ${data.user}`); });
// ----------------------
// RENDER COMMANDS
// ----------------------
export function renderMasterCommands(){
  const container = document.getElementById('masterList');
  if(!container) return;
  container.innerHTML = '';

  if(masterCommands.length === 0){
    const ph = document.createElement('div');
    ph.className = 'placeholder';
    ph.innerText = 'No commands yet.';
    container.appendChild(ph);
    return;
  }

  masterCommands.forEach(cmd => {
    const div = document.createElement('div');
    div.className = 'commandItem';
    
    // Display command name and permission
    div.innerHTML = `<strong>${cmd.name}</strong> | Permission: ${cmd.permission || 'all'}`;

    // Admin-only buttons
    if(loggedInUser.role === 'admin'){
      const editBtn = document.createElement('button');
      editBtn.innerText = 'Edit';
      editBtn.onclick = () => editMasterAPI(cmd.id);
      div.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.innerText = 'Delete';
      delBtn.onclick = () => deleteMasterAPI(cmd.id);
      div.appendChild(delBtn);
    }

    // Execute button for allowed users
    const execBtn = document.createElement('button');
    execBtn.innerText = 'Execute';
    execBtn.onclick = () => executeMasterById(cmd.id, loggedInUser);
    div.appendChild(execBtn);

    container.appendChild(div);
  });
}

// ----------------------
// ADMIN CONTROLS
// ----------------------
export async function addNewCommand(){
  if(loggedInUser.role !== 'admin') return alert('Only admin can create commands');
  
  const name = prompt('Command Name');
  if(!name) return;
  const action = prompt('JS Action');
  if(!action) return;
  const permission = prompt('Permission (all, badge, specialAccess)', 'all');

  try{
    const newCmd = await addMasterCommand(name, action, permission);
    masterCommands.push(newCmd);
    renderMasterCommands();
    socket.emit('masterCommandAdded', newCmd);
  } catch(e){
    console.error('Failed to add command', e);
    alert('Failed to add command!');
  }
}
// ----------------------
// EXECUTE COMMAND
// ----------------------
export async function executeMasterById(id, user = loggedInUser){
  const cmd = masterCommands.find(c => c.id === id);
  if(!cmd) return alert('Command not found');

  // Permission check
  const hasPermission =
    cmd.permission === 'all' ||
    (cmd.permission === 'badge' && user.badges?.length) ||
    user.specialAccess?.includes(cmd.permission) ||
    user.role === 'admin'; // Admin bypass

  if(!hasPermission){
    warnings[user.username] = (warnings[user.username] || 0) + 1;
    alert(`Access denied! Warning ${warnings[user.username]}/5`);
    if(warnings[user.username] >= 6) lockUserTemporarily(user.username, warnings[user.username]*10);
    return;
  }

  // Show overlay animation
  showCommandOverlay(cmd.name, user.username);

  try { 
    eval(cmd.action); 
    addLog(`Executed ${cmd.name} by ${user.username}`); 
  } catch(e){ 
    console.error('Command execution failed', e); 
  }

  socket.emit('masterCommandExecuted', {id, user: user.username});
}

// ----------------------
// COMMAND OVERLAY ANIMATION
// ----------------------
function showCommandOverlay(name, user){
  const overlay = document.createElement('div');
  overlay.id = 'commandOverlay';
  overlay.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%;
    background: rgba(0,0,0,0.75); display:flex; justify-content:center; align-items:center;
    color:white; font-size:2em; flex-direction:column; z-index:9999;
  `;
  overlay.innerHTML = `⚡ ${name} executed by ${user} ⚡`;
  document.body.appendChild(overlay);

  overlay.animate([{opacity:0, transform:'scale(0.9)'},{opacity:1, transform:'scale(1)'}],
                  {duration:400, fill:'forwards'});
  setTimeout(() => {
    overlay.animate([{opacity:1, transform:'scale(1)'},{opacity:0, transform:'scale(0.9)'}],
                    {duration:400, fill:'forwards'})
          .onfinish = () => overlay.remove();
  }, 1500);
}

// ----------------------
// TEMPORARY USER LOCK
// ----------------------
function lockUserTemporarily(user, sec){
  if(user === loggedInUser.username && loggedInUser.role !== 'admin'){
    alert(`You are locked for ${sec} seconds!`);
    renderGlobalLockAnimation(sec, false);
  }
}

// ----------------------
// GLOBAL LOCK SYSTEM
// ----------------------
export function lockAllUsersPrompt(){
  if(loggedInUser.role !== 'admin') return alert('Only admin can lock users');
  const durations = {'1 min':60,'2 min':120,'5 min':300};
  let choice = prompt('Enter lock duration: 1 min / 2 min / 5 min','1 min');
  const sec = durations[choice] || 60;
  lockAllUsers(sec,false);
}

export function lockAllUsers(sec=30, permanent=false){
  globalLock.active = true;
  globalLock.unlockTime = Date.now() + sec*1000;
  renderGlobalLockAnimation(sec, permanent);

  if(!permanent){
    if(countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(()=>{
      const remaining = Math.ceil((globalLock.unlockTime - Date.now())/1000);
      const timer = document.getElementById('countdownTimer');
      if(remaining>0) timer.innerText = `Unlock in ${remaining} sec`;
      else {
        globalLock.active = false;
        globalLock.unlockTime = null;
        clearInterval(countdownInterval);
        removeGlobalLockAnimation();
      }
    },1000);
  }
}

function renderGlobalLockAnimation(sec, permanent=false){
  if(loggedInUser.role === 'admin') return; // Admin bypass
  const overlay = document.getElementById('globalLockOverlay');
  if(!overlay) return;
  overlay.style.display='flex';
  document.getElementById('lockMessage').innerText = permanent?'🔒 All Users Locked Permanently':'🔒 All Users Locked';
  const timer = document.getElementById('countdownTimer');
  timer.innerText = permanent ? '' : `Unlock in ${sec} sec`;
}

function removeGlobalLockAnimation(){
  const overlay = document.getElementById('globalLockOverlay');
  if(overlay) overlay.style.display='none';
  const timer = document.getElementById('countdownTimer');
  if(timer) timer.innerText='';
}

// ----------------------
// LOGGING EXECUTIONS
// ----------------------
async function addLog(msg){
  try{
    const logs = await fetchLogs(); // fetch existing logs from API
    logs.unshift({ msg, time: new Date().toLocaleString() });
    await saveLogs(logs); // save updated logs
  } catch(e){
    console.error('Failed to log message', e);
  }
}

// ----------------------
// RESTORE LAST DELETED TEST
// ----------------------
let lastDeletedTest = null;

export function deleteLastTestPrompt(){
  if(!state.createdTests || !state.createdTests.length) return alert('No tests to delete');
  const lastTest = state.createdTests.pop();
  lastDeletedTest = lastTest;
  renderCreatedTests();
  alert(`Deleted last test: ${lastTest.name}`);
}

export function restoreLastDeletedTest(){
  if(!lastDeletedTest) return alert('No deleted test to restore');
  state.createdTests.push(lastDeletedTest);
  renderCreatedTests();
  alert(`Restored test: ${lastDeletedTest.name}`);
  lastDeletedTest = null;
}

// ----------------------
// EXECUTE COMMAND BY NAME INPUT
// ----------------------
const commandInput = document.getElementById('masterCommandInput');
if(commandInput){
  commandInput.addEventListener('keypress', e => {
    if(e.key === 'Enter'){
      const cmdName = commandInput.value.trim();
      if(!cmdName) return;
      const cmd = masterCommands.find(c => c.name.toLowerCase() === cmdName.toLowerCase());
      if(!cmd) return alert('Command not found');
      executeMasterById(cmd.id, loggedInUser);
      commandInput.value = '';
    }
  });
}

// ----------------------
// INITIALIZATION
// ----------------------
document.addEventListener('DOMContentLoaded', async () => {
  await loadMasterCommands();
  // Admin bypass: hide overlay if admin
  if(loggedInUser.role === 'admin'){
    removeGlobalLockAnimation();
  }
});

// ---------- Master Command System (JSON-based, Safe & Persistent) ----------
import { getMasterCommands, saveMasterCommands, getUsers, saveUsers, fetchLogs, saveLogs } from './api.js';

const socket = io(); // Socket.IO client

let masterCommands = [];
let users = {};
let warnings = {};
let countdownInterval = null;

// Preloaded commands
const preCommands = [
  { name:'Lock All Temporary', action:'lockAllUsersPrompt()', permission:'admin' },
  { name:'Lock All Permanent', action:'lockAllUsers(60,true)', permission:'admin' },
  { name:'Global Broadcast', action:'showGlobalMessage("This is a global message!")', permission:'admin' }
];

// ---------- Load Users & Commands ----------
async function loadData() {
  try {
    masterCommands = await getMasterCommands();
    if(masterCommands.length === 0) masterCommands = [...preCommands];
  } catch(e){
    console.error('Failed to load master commands:', e);
    masterCommands = [...preCommands];
  }

  try {
    users = await getUsers();
  } catch(e){
    console.error('Failed to load users:', e);
    users = {};
  }

  renderMasterCommands();
  checkLockedUsers();
}

// ---------- Render Commands ----------
export function renderMasterCommands() {
  const list = document.getElementById('masterList');
  if(!list) return;
  list.innerHTML = '';

  if(masterCommands.length === 0){
    list.innerHTML = '<div class="placeholder">No commands yet.</div>';
    return;
  }

  masterCommands.forEach((cmd, idx) => {
    const div = document.createElement('div');
    div.className = 'commandItem';
    div.innerHTML = `
      <strong>${cmd.name}</strong> | Permission: ${cmd.permission || 'all'}
      <button style="margin-left:5px;" onclick="executeMasterById(${idx})">Execute</button>
      <button style="margin-left:5px; background:red; color:white; margin-left:5px;" onclick="deleteMasterCommand(${idx})">Delete</button>
    `;
    list.appendChild(div);
  });
}

// ---------- Add Command ----------
export async function addMasterCommandAPI(name, action, permission='all') {
  if(!name || !action) return alert('Command name and action required');
  const newCmd = { name, action, permission };
  masterCommands.push(newCmd);
  await saveMasterCommands(masterCommands);
  renderMasterCommands();
  socket.emit('masterCommandAdded', newCmd);
}

// ---------- Delete Command ----------
export async function deleteMasterCommand(idx) {
  if(idx < 0 || idx >= masterCommands.length) return alert('Invalid command index');
  if(!confirm(`Delete "${masterCommands[idx].name}"?`)) return;
  masterCommands.splice(idx,1);
  await saveMasterCommands(masterCommands);
  renderMasterCommands();
  socket.emit('masterCommandDeleted', idx);
}

// ---------- Execute Command ----------
export async function executeMasterById(idx, username='admin1') {
  const cmd = masterCommands[idx];
  if(!cmd) return alert('Command not found');

  const user = Object.values(users).find(u => u.username === username);
  if(!user) return alert('User not found');

  // Permission check
  const hasPermission = cmd.permission === 'all' ||
                        (cmd.permission === 'admin' && user.role === 'admin') ||
                        (cmd.permission === 'badge' && user.badges?.length) ||
                        user.specialAccess?.includes(cmd.permission);

  if(!hasPermission){
    warnings[user.username] = (warnings[user.username] || 0) + 1;
    alert(`Access denied! Warning ${warnings[user.username]}/5`);
    if(warnings[user.username] >= 6) lockUser(user.username, warnings[user.username]*10);
    return;
  }

  showCommandOverlay(cmd.name, user.username);

  try {
    eval(cmd.action); // execute JS code
    await addLog(`Executed ${cmd.name} by ${user.username}`);
  } catch(e) {
    console.error('Command execution failed:', e);
  }

  socket.emit('masterCommandExecuted', { idx, user: user.username });
}

// ---------- Command Overlay ----------
function showCommandOverlay(name, user){
  const overlay = document.createElement('div');
  overlay.id = 'commandOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;font-size:2em;flex-direction:column;z-index:9999;background:rgba(0,0,0,0.7);';
  overlay.innerHTML = `⚡ ${name} executed by ${user} ⚡`;
  document.body.appendChild(overlay);
  overlay.animate([{opacity:0,transform:'scale(0.9)'},{opacity:1,transform:'scale(1)'}],{duration:400,fill:'forwards'});
  setTimeout(()=>overlay.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(0.9)'}],{duration:400,fill:'forwards'}).onfinish=()=>overlay.remove(),1500);
}

// ---------- Lock / Unlock Users ----------
export async function lockAllUsers(sec=60, permanent=false) {
  Object.values(users).forEach(u => { if(u.role !== 'admin') u.locked = true; });
  await saveUsers(users);

  renderGlobalLockOverlay(sec, permanent);

  if(!permanent){
    if(countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdown,1000);
    setTimeout(async ()=>{
      Object.values(users).forEach(u => { if(u.role !== 'admin') u.locked = false; });
      await saveUsers(users);
      removeGlobalLockOverlay();
      clearInterval(countdownInterval);
    }, sec*1000);
  }
}

export async function unlockAllUsers(){
  Object.values(users).forEach(u => u.locked = false);
  await saveUsers(users);
  removeGlobalLockOverlay();
}

// ---------- Lock Overlay ----------
function renderGlobalLockOverlay(sec, permanent=false){
  const overlay = document.getElementById('globalLockOverlay');
  if(!overlay) return;
  overlay.style.display='flex';
  document.getElementById('lockMessage').innerText = permanent ? '🔒 All Users Locked Permanently' : '🔒 All Users Locked';
  document.getElementById('countdownTimer').innerText = permanent ? '' : `Unlock in ${sec} sec`;
}

function updateCountdown(){
  const overlay = document.getElementById('globalLockOverlay');
  if(!overlay) return;
  // For simplicity, show placeholder countdown
  document.getElementById('countdownTimer').innerText = 'Unlock in active';
}

function removeGlobalLockOverlay(){
  const overlay = document.getElementById('globalLockOverlay');
  if(overlay) overlay.style.display='none';
}

// ---------- Lock Individual User ----------
export async function lockUser(username, sec=30){
  const user = Object.values(users).find(u => u.username === username);
  if(!user) return;
  user.locked = true;
  await saveUsers(users);
  renderGlobalLockOverlay(sec);
  setTimeout(async ()=>{ user.locked=false; await saveUsers(users); removeGlobalLockOverlay(); }, sec*1000);
}

// ---------- Check Locked Users on Load ----------
async function checkLockedUsers(){
  const loggedInUser = Object.values(users).find(u => u.role === 'admin'); // or current logged-in
  if(loggedInUser && loggedInUser.locked){
    renderGlobalLockOverlay(0,true);
  }
}

// ---------- Logging ----------
async function addLog(msg){
  try{
    const logs = await fetchLogs();
    logs.unshift({ msg, time: new Date().toLocaleString() });
    await saveLogs(logs);
  } catch(e){ console.error('Failed to log:', e); }
}

// ---------- Expose functions to window ----------
window.executeMasterById = executeMasterById;
window.addNewCommand = addMasterCommandAPI;
window.deleteMasterCommand = deleteMasterCommand;
window.lockAllUsersPrompt = () => {
  const sec = parseInt(prompt('Enter lock duration in seconds', '60'), 10) || 60;
  lockAllUsers(sec,false);
};
window.unlockAllUsers = unlockAllUsers;

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', loadData);

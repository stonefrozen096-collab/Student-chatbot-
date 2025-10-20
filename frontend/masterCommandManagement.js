/* ---------- MASTER COMMAND SYSTEM (JSON VERSION) ---------- */
let masterCommands = [];
let warnings = {};
let globalLock = { active: false, unlockTime: null };

// Load commands & warnings from JSON file
async function loadMasterCommands() {
try {
const resCmds = await fetch('data/masterCommands.json');
masterCommands = await resCmds.json();
} catch (e) {
console.error('Failed to load master commands:', e);
masterCommands = [];
}

try {
const resWarn = await fetch('data/masterWarnings.json');
warnings = await resWarn.json();
} catch (e) {
warnings = {};
}

renderMasterCommands();
}

// Save commands & warnings back (simulate JSON persist)
function saveMasterCommands() {
// In real scenario, send POST/PUT request to server
console.log('Master commands saved (JSON persistence requires server API)');
}

function saveWarnings() {
console.log('Warnings saved (JSON persistence requires server API)');
}

/* ---------- RENDER COMMANDS ---------- */
function renderMasterCommands() {
const c = document.getElementById('masterList');
if(!c) return;
c.innerHTML = '';
masterCommands.forEach((cmd, i) => {
const div = document.createElement('div');
div.style.padding = '6px';
div.style.borderBottom = '1px solid rgba(255,255,255,0.02)';
div.innerHTML = <strong>${cmd.name}</strong> | Permission: ${cmd.permission || 'all'}   <button class="btn tiny btn-ghost" onclick="editMaster(${i})">Edit</button>   <button class="btn tiny btn-danger" onclick="deleteMaster(${i})">Delete</button>   <button class="btn tiny btn-primary" onclick="executeMaster(${i})">Execute</button>;
c.appendChild(div);
});
}

/* ---------- ADMIN ADD COMMAND ---------- */
function addMasterCommand(name, action, permission = 'all') {
masterCommands.push({ name, action, permission });
saveMasterCommands();
renderMasterCommands();
}

/* ---------- EDIT / DELETE COMMAND ---------- */
function editMaster(index) {
const cmd = masterCommands[index];
if(!cmd) return;
const newName = prompt('Command Name', cmd.name);
if(newName!==null) cmd.name = newName;
const newAction = prompt('JS Action', cmd.action);
if(newAction!==null) cmd.action = newAction;
const newPerm = prompt('Permission (all or badge name)', cmd.permission || 'all');
if(newPerm!==null) cmd.permission = newPerm;
saveMasterCommands();
renderMasterCommands();
}

function deleteMaster(index) {
if(!confirm('Delete this command?')) return;
masterCommands.splice(index,1);
saveMasterCommands();
renderMasterCommands();
}

/* ---------- EXECUTE COMMAND ---------- */
function executeMaster(index, user = {username:'admin', badges:[]}) {
const cmd = masterCommands[index];
if(!cmd) return alert('Command not found');

// Check permission
if(cmd.permission !== 'all' && !user.badges.includes(cmd.permission)) {
warnings[user.username] = (warnings[user.username] || 0) + 1;
saveWarnings();
const attempts = warnings[user.username];
alert(Access denied! Warning ${attempts}/5);
if(attempts >= 6) lockUserTemporarily(user.username, attempts * 10);
return;
}

// Show animated overlay for all commands
showCommandOverlay(cmd.name, user.username);

try {
eval(cmd.action); // execute JS action
addLog(Executed master command: ${cmd.name} by ${user.username});
} catch(e) {
console.error('Master command execution failed:', e);
}
}

/* ---------- ANIMATED OVERLAY ---------- */
function showCommandOverlay(cmdName, username) {
const overlay = document.createElement('div');
overlay.id = 'commandOverlay';
overlay.style.position = 'fixed';
overlay.style.top = 0;
overlay.style.left = 0;
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.background = 'rgba(0,0,0,0.75)';
overlay.style.display = 'flex';
overlay.style.alignItems = 'center';
overlay.style.justifyContent = 'center';
overlay.style.color = 'white';
overlay.style.fontSize = '2em';
overlay.style.flexDirection = 'column';
overlay.style.zIndex = 9999;
overlay.innerHTML = ⚡ ${cmdName} executed by ${username} ⚡;

document.body.appendChild(overlay);

// Animate
overlay.animate([
{ opacity: 0, transform: 'scale(0.9)' },
{ opacity: 1, transform: 'scale(1)' }
], { duration: 400, fill: 'forwards' });

setTimeout(() => {
overlay.animate([
{ opacity: 1, transform: 'scale(1)' },
{ opacity: 0, transform: 'scale(0.9)' }
], { duration: 400, fill: 'forwards' }).onfinish = () => overlay.remove();
}, 1500); // overlay stays for 1.5s
}

/* ---------- WARNINGS & TEMP LOCK ---------- /
function lockUserTemporarily(username, seconds) {
addLog(${username} locked for ${seconds} seconds due to misuse);
const userLock = { active:true, unlockTime: Date.now() + seconds1000 };
console.log(User ${username} temporarily locked for ${seconds}s);
alert(User ${username} is temporarily locked for ${seconds} seconds!);
}

/* ---------- GLOBAL LOCK ---------- /
function lockAllUsers(durationSeconds = 30, permanent=false) {
globalLock.active = true;
globalLock.unlockTime = Date.now() + durationSeconds1000;
renderGlobalLockAnimation(durationSeconds, permanent);
if(!permanent) {
setTimeout(() => {
globalLock.active = false;
globalLock.unlockTime = null;
removeGlobalLockAnimation();
}, durationSeconds*1000);
}
}

function renderGlobalLockAnimation(duration, permanent=false) {
const overlay = document.createElement('div');
overlay.id='globalLockOverlay';
overlay.style.position='fixed';
overlay.style.top=0; overlay.style.left=0; overlay.style.width='100%';
overlay.style.height='100%'; overlay.style.background='rgba(0,0,0,0.85)';
overlay.style.zIndex=9999; overlay.style.display='flex';
overlay.style.alignItems='center'; overlay.style.justifyContent='center';
overlay.style.flexDirection='column'; overlay.style.color='white';
overlay.style.fontSize='2em';
overlay.innerHTML = permanent
? 🔒 All Users Locked Permanently
: 🔒 All Users Locked<br>Unlock in ${duration} sec;
document.body.appendChild(overlay);
}

function removeGlobalLockAnimation() {
const overlay = document.getElementById('globalLockOverlay');
if(overlay) overlay.remove();
}

/* ---------- PRELOADED COMMANDS ---------- */
if(masterCommands.length===0){
addMasterCommand('Lock All Temporary', 'lockAllUsers(60)', 'admin');
addMasterCommand('Lock All Permanent', 'lockAllUsers(0,true)', 'admin');
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

// Initial load
document.addEventListener('DOMContentLoaded', loadMasterCommands);


                           

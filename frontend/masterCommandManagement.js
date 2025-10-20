// ---------- Master Command System (API Version) ----------

let masterCommands = [];
let warnings = {};
let globalLock = { active: false, unlockTime: null };
let countdownInterval = null;

// Preloaded commands (fallback)
const preCommands = [
  {name:'Lock All Temporary', action:'lockAllUsersPrompt()', permission:'admin'},
  {name:'Lock All Permanent', action:'lockAllUsers(0,true)', permission:'admin'},
  {name:'Delete Last Test', action:'state.createdTests.pop(); renderCreatedTests();', permission:'admin'},
  {name:'Restore Last Deleted Test', action:'restoreLastDeletedTest();', permission:'admin'},
  {name:'Global Broadcast', action:'showGlobalMessage("This is a broadcast!")', permission:'admin'},
  {name:'Highlight Message', action:'alert("Highlight executed!")', permission:'admin'},
  {name:'Sample Test Command', action:'console.log("Sample Test Run")', permission:'all'}
];

// ---------- Load from API ----------
async function loadMasterCommands(){
  try { 
    masterCommands = await getMasterCommands(); // API call from api.js
  } catch(e){ 
    console.error('Failed to load master commands from API', e); 
    masterCommands = [...preCommands]; 
  }

  try { 
    warnings = {}; // Could extend to API if needed
  } catch(e){ 
    warnings={}; 
  }

  renderMasterCommands();
}

// ---------- Render Commands ----------
function renderMasterCommands(){
  const c = document.getElementById('masterList'); if(!c) return; 
  c.innerHTML = '';
  if(masterCommands.length === 0){
    const ph = document.createElement('div'); ph.className = 'placeholder'; ph.innerText = 'No commands yet.'; c.appendChild(ph); return;
  }
  masterCommands.forEach((cmd) => {
    const div = document.createElement('div'); div.className = 'commandItem';
    div.innerHTML=`<strong>${cmd.name}</strong> | Permission: ${cmd.permission || 'all'}
      <button class="btn btn-ghost" onclick="editMasterAPI('${cmd.id}')">Edit</button>
      <button class="btn btn-danger" onclick="deleteMasterAPI('${cmd.id}')">Delete</button>
      <button class="btn btn-primary" onclick="executeMasterById('${cmd.id}')">Execute</button>`;
    c.appendChild(div);
    setTimeout(()=>div.classList.add('fadeIn'),50);
  });
}

// ---------- Add/Edit/Delete via API ----------
async function promptAddCommand(){
  const name = prompt('Command Name'); if(!name) return;
  const action = prompt('JS Action'); if(!action) return;
  const permission = prompt('Permission (all, badge, or dynamic special access)', 'all');
  await addMasterCommandAPI(name, action, permission);
}

async function addMasterCommandAPI(name, action, permission='all'){
  try{
    const newCmd = await addMasterCommand(name, action, permission); // api.js
    masterCommands.push(newCmd);
    renderMasterCommands();
  } catch(e){
    console.error('Failed to add master command', e);
    alert('Failed to add command!');
  }
}

async function editMasterAPI(id){
  const cmd = masterCommands.find(c=>c.id===id); if(!cmd) return;
  const n = prompt('Command Name', cmd.name); if(n!==null) cmd.name = n;
  const a = prompt('JS Action', cmd.action); if(a!==null) cmd.action = a;
  const p = prompt('Permission', cmd.permission||'all'); if(p!==null) cmd.permission = p;

  try{
    const updated = await editMasterCommand(id, cmd.name, cmd.action, cmd.permission); // api.js
    const idx = masterCommands.findIndex(c=>c.id===id); masterCommands[idx] = updated;
    renderMasterCommands();
  } catch(e){
    console.error('Failed to edit master command', e);
    alert('Failed to edit command!');
  }
}

async function deleteMasterAPI(id){
  if(!confirm('Delete this command?')) return;
  try{
    await deleteMasterCommand(id); // api.js
    masterCommands = masterCommands.filter(c=>c.id!==id);
    renderMasterCommands();
  } catch(e){
    console.error('Failed to delete master command', e);
    alert('Failed to delete command!');
  }
}

// ---------- Execute ----------
async function executeMasterById(id, user={username:'admin', badges:[], specialAccess:[]}){
  const cmd = masterCommands.find(c=>c.id===id);
  if(!cmd) return alert('Command not found');

  const hasPermission = cmd.permission === 'all' || 
                        (cmd.permission === 'badge' && user.badges?.length) ||
                        (user.specialAccess?.includes(cmd.permission));

  if(!hasPermission){
    warnings[user.username] = (warnings[user.username]||0)+1;
    // Optional: save warnings via API if implemented
    alert(`Access denied! Warning ${warnings[user.username]}/5`);
    if(warnings[user.username]>=6) lockUserTemporarily(user.username, warnings[user.username]*10);
    return;
  }

  showCommandOverlay(cmd.name,user.username);
  try { eval(cmd.action); addLog(`Executed ${cmd.name} by ${user.username}`); }
  catch(e){ console.error('Master command failed', e); }
}

// ---------- Overlay ----------
function showCommandOverlay(name,user){
  const overlay=document.createElement('div'); overlay.id='commandOverlay';
  overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;color:white;font-size:2em;flex-direction:column;z-index:9999;';
  overlay.innerHTML=`⚡ ${name} executed by ${user} ⚡`;
  document.body.appendChild(overlay);
  overlay.animate([{opacity:0,transform:'scale(0.9)'},{opacity:1,transform:'scale(1)'}],{duration:400,fill:'forwards'});
  setTimeout(()=>overlay.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(0.9)'}],{duration:400,fill:'forwards'}).onfinish=()=>overlay.remove(),1500);
}

// ---------- Temp lock ----------
function lockUserTemporarily(user,sec){
  alert(`User ${user} locked for ${sec} seconds!`);
}

// ---------- Lock All Users ----------
function lockAllUsersPrompt(){
  const durations = {'1 min':60,'2 min':120,'5 min':300};
  let choice = prompt('Enter lock duration: 1 min / 2 min / 5 min','1 min');
  let sec = durations[choice] || 60;
  lockAllUsers(sec,false);
}
function lockAllUsers(sec=30,permanent=false){
  globalLock.active=true; globalLock.unlockTime=Date.now()+sec*1000;
  renderGlobalLockAnimation(sec,permanent);
  if(!permanent){
    if(countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdown,1000);
    setTimeout(()=>{
      globalLock.active=false; globalLock.unlockTime=null; removeGlobalLockAnimation();
      clearInterval(countdownInterval);
    },sec*1000);
  }
}
function renderGlobalLockAnimation(sec,permanent=false){
  const overlay=document.getElementById('globalLockOverlay'); overlay.style.display='flex';
  document.getElementById('lockMessage').innerHTML=permanent?'🔒 All Users Locked Permanently':'🔒 All Users Locked';
  document.getElementById('countdownTimer').innerText = permanent ? '' : `Unlock in ${sec} sec`;
}
function updateCountdown(){
  const remaining=Math.ceil((globalLock.unlockTime-Date.now())/1000);
  document.getElementById('countdownTimer').innerText = remaining>0 ? `Unlock in ${remaining} sec` : '';
}
function removeGlobalLockAnimation(){ 
  const overlay=document.getElementById('globalLockOverlay'); overlay.style.display='none';
  document.getElementById('countdownTimer').innerText='';
}

// ---------- Global Message ----------
function showGlobalMessage(msg){
  const overlay=document.getElementById('globalLockOverlay'); overlay.style.display='flex';
  document.getElementById('lockMessage').innerHTML=msg;
  document.getElementById('countdownTimer').innerText='';
  setTimeout(()=>overlay.style.display='none',3000);
}

// ---------- Restore Last Deleted Test ----------
let lastDeletedTest = null;
function deleteTestForMaster(id){
  const index = state.createdTests.findIndex(t=>t.id===id);
  if(index===-1) return;
  lastDeletedTest = state.createdTests.splice(index,1)[0];
  renderCreatedTests();
}
function restoreLastDeletedTest(){
  if(lastDeletedTest) { state.createdTests.push(lastDeletedTest); renderCreatedTests(); lastDeletedTest=null; }
}

// ---------- Log ----------
async function addLog(msg){
  try{
    const logs = await fetchLogs(); // API call
    logs.unshift({msg,time:new Date().toLocaleString()});
    await saveLogs(logs); // API call
  } catch(e){
    console.error('Failed to log message', e);
  }
}

// ---------- Initialize ----------
document.addEventListener('DOMContentLoaded', loadMasterCommands);

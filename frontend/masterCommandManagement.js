/* ---------- MASTER COMMAND SYSTEM (JSON VERSION) ---------- */
let masterCommands = [];
let warnings = {};
let globalLock = { active:false, unlockTime:null };
let countdownInterval = null;

// Preloaded commands
const preCommands = [
  {name:'Lock All Temporary', action:'lockAllUsersPrompt()', permission:'admin'},
  {name:'Lock All Permanent', action:'lockAllUsers(0,true)', permission:'admin'},
  {name:'Delete Last Test', action:'state.createdTests.pop(); renderCreatedTests();', permission:'admin'},
  {name:'Restore Last Deleted Test', action:'restoreLastDeletedTest();', permission:'admin'},
  {name:'Global Broadcast', action:'showGlobalMessage("This is a broadcast!")', permission:'admin'},
  {name:'Highlight Message', action:'alert("Highlight executed!")', permission:'admin'},
  {name:'Sample Test Command', action:'console.log("Sample Test Run")', permission:'admin'}
];

/* ---------- LOAD FROM JSON ---------- */
async function loadMasterCommands(){
  try { const resCmds = await fetch('data/masterCommands.json'); masterCommands = await resCmds.json(); }
  catch(e){ console.error('Failed to load commands JSON',e); masterCommands=[...preCommands]; }

  try { const resWarn = await fetch('data/masterWarnings.json'); warnings = await resWarn.json(); }
  catch(e){ warnings={}; }

  renderMasterCommands();
}

/* ---------- SAVE TO JSON ---------- */
function saveMasterCommands(){ console.log('Master commands saved. Requires server API for persistence'); }
function saveWarnings(){ console.log('Warnings saved. Requires server API for persistence'); }

/* ---------- RENDER COMMANDS ---------- */
function renderMasterCommands(){
  const c=document.getElementById('masterList'); if(!c) return; c.innerHTML='';
  if(masterCommands.length===0){
    const ph=document.createElement('div'); ph.className='placeholder'; ph.innerText='No commands yet.'; c.appendChild(ph); return;
  }
  masterCommands.forEach((cmd,i)=>{
    const div=document.createElement('div'); div.className='commandItem';
    div.innerHTML=`<strong>${cmd.name}</strong> | Permission: ${cmd.permission || 'all'}
      <button class="btn btn-ghost" onclick="editMaster(${i})">Edit</button>
      <button class="btn btn-danger" onclick="deleteMaster(${i})">Delete</button>
      <button class="btn btn-primary" onclick="executeMaster(${i})">Execute</button>`;
    c.appendChild(div);
    setTimeout(()=>div.classList.add('fadeIn'),50);
  });
}

/* ---------- ADD / EDIT / DELETE ---------- */
function promptAddCommand(){
  const name = prompt('Command Name'); if(!name) return;
  const action = prompt('JS Action'); if(!action) return;
  const permission = prompt('Permission (all or badge)') || 'all';
  addMasterCommand(name,action,permission);
}
function addMasterCommand(name,action,permission='all'){ masterCommands.push({name,action,permission}); saveMasterCommands(); renderMasterCommands(); }
function editMaster(index){
  const cmd=masterCommands[index]; if(!cmd) return;
  const n=prompt('Command Name',cmd.name); if(n!==null) cmd.name=n;
  const a=prompt('JS Action',cmd.action); if(a!==null) cmd.action=a;
  const p=prompt('Permission',cmd.permission||'all'); if(p!==null) cmd.permission=p;
  saveMasterCommands(); renderMasterCommands();
}
function deleteMaster(index){ if(!confirm('Delete this command?')) return; masterCommands.splice(index,1); saveMasterCommands(); renderMasterCommands(); }

/* ---------- EXECUTE ---------- */
function executeMaster(index,user={username:'admin',badges:[]}){
  const cmd=masterCommands[index]; if(!cmd) return alert('Command not found');
  if(cmd.permission!=='all' && !user.badges.includes(cmd.permission)){
    warnings[user.username]=(warnings[user.username]||0)+1; saveWarnings();
    const attempts=warnings[user.username]; alert(`Access denied! Warning ${attempts}/5`);
    if(attempts>=6) lockUserTemporarily(user.username,attempts*10); return;
  }
  showCommandOverlay(cmd.name,user.username);
  try{ eval(cmd.action); addLog(`Executed ${cmd.name} by ${user.username}`); }
  catch(e){ console.error('Master command failed',e); }
}

/* ---------- ANIMATED OVERLAY ---------- */
function showCommandOverlay(name,user){
  const overlay=document.createElement('div'); overlay.id='commandOverlay';
  overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;color:white;font-size:2em;flex-direction:column;z-index:9999;';
  overlay.innerHTML=`⚡ ${name} executed by ${user} ⚡`;
  document.body.appendChild(overlay);
  overlay.animate([{opacity:0,transform:'scale(0.9)'},{opacity:1,transform:'scale(1)'}],{duration:400,fill:'forwards'});
  setTimeout(()=>overlay.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(0.9)'}],{duration:400,fill:'forwards'}).onfinish=()=>overlay.remove(),1500);
}

/* ---------- TEMP LOCK ---------- */
function lockUserTemporarily(user,sec){
  addLog(`${user} locked ${sec}s due to misuse`);
  alert(`User ${user} locked for ${sec} seconds!`);
}

/* ---------- LOCK ALL USERS ---------- */
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

/* ---------- GLOBAL MESSAGE ---------- */
function showGlobalMessage(msg){
  const overlay=document.getElementById('globalLockOverlay'); overlay.style.display='flex';
  document.getElementById('lockMessage').innerHTML=msg;
  document.getElementById('countdownTimer').innerText='';
  setTimeout(()=>overlay.style.display='none',3000);
}

/* ---------- RESTORE LAST DELETED TEST ---------- */
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

/* ---------- LOG ---------- */
function addLog(msg){
  const logs=JSON.parse(localStorage.getItem('logs')||'[]');
  logs.unshift({msg,time:new Date().toLocaleString()});
  localStorage.setItem('logs',JSON.stringify(logs));
}

/* ---------- INITIAL LOAD ---------- */
document.addEventListener('DOMContentLoaded', loadMasterCommands);

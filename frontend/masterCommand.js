// ---------- Master Command System JS ----------
const socket = io(); // Socket.IO client

// -------------------- Users --------------------
// Replace with your JSON fetch in real deployment
const users = [
  { username:'admin1', role:'admin', badges:['master'], specialAccess:['all'], locked:false },
  { username:'user1', role:'student', badges:[], specialAccess:[], locked:false }
];

// Current logged-in user (for demo, admin1)
const currentUser = users[0];

// Show admin controls only for admin
if(currentUser.role==='admin') document.getElementById('adminControls').style.display='block';

// -------------------- Commands --------------------
let masterCommands = [
  {name:'Lock All Temporary', action:'lockAllUsersPrompt()', permission:'all'},
  {name:'Lock All Permanent', action:'lockAllUsers(0,true)', permission:'all'},
  {name:'Global Broadcast', action:'showGlobalMessage("This is a broadcast!")', permission:'all'}
];

// -------------------- Render Commands --------------------
export function renderMasterCommands(){
  const list = document.getElementById('masterList');
  list.innerHTML='';

  masterCommands.forEach((cmd, idx)=>{
    const div = document.createElement('div');
    div.className='commandItem';
    div.innerHTML = `
      <span>${cmd.name}</span>
      <div>
        <button onclick="executeCommand(${idx})">Execute</button>
        <button onclick="deleteCommand(${idx})" style="background:red;color:white;border:none;border-radius:4px;padding:2px 6px;">Delete</button>
      </div>
    `;
    list.appendChild(div);
  });
}
renderMasterCommands();

// -------------------- Execute Command --------------------
window.executeCommand = function(idx){
  const cmd = masterCommands[idx];
  const hasAccess = currentUser.role==='admin' || 
                    currentUser.badges.includes(cmd.permission) || 
                    currentUser.specialAccess.includes(cmd.permission);

  if(!hasAccess){
    alert('❌ Access denied!');
    return;
  }
  try{
    eval(cmd.action);
    alert(`✅ Command executed: ${cmd.name}`);
  }catch(e){
    console.error(e);
    alert('❌ Error executing command');
  }
};

// -------------------- Add New Command --------------------
window.addNewCommand = function(){
  const name = prompt('Command Name'); if(!name) return;
  const action = prompt('JS Action'); if(!action) return;
  const permission = prompt('Permission badge/special access (e.g., master, special)') || 'all';
  masterCommands.push({name, action, permission});
  renderMasterCommands();
  alert('✅ Command added!');
};

// -------------------- Delete Command --------------------
window.deleteCommand = function(idx){
  if(!confirm(`Are you sure you want to delete "${masterCommands[idx].name}"?`)) return;
  masterCommands.splice(idx,1);
  renderMasterCommands();
  alert('✅ Command deleted!');
};

// -------------------- Input Box Execution --------------------
document.getElementById('masterCommandInput').addEventListener('keypress', e=>{
  if(e.key==='Enter'){
    const cmdName = e.target.value.trim();
    const idx = masterCommands.findIndex(c=>c.name===cmdName);
    if(idx!==-1) executeCommand(idx);
    else alert('❌ Command not found');
    e.target.value='';
  }
});

// -------------------- Global Lock --------------------
let globalLock = { active:false, unlockTime:null };
let lockInterval = null;

window.lockAllUsersPrompt = function(){
  const sec = parseInt(prompt('Lock duration in seconds', '30')) || 30;
  lockAllUsers(sec);
};

window.lockAllUsers = function(sec=30, permanent=false){
  globalLock.active=true;
  globalLock.unlockTime=Date.now()+sec*1000;
  const overlay=document.getElementById('globalLockOverlay');
  overlay.style.display='flex';
  document.getElementById('lockMessage').innerText = permanent?'🔒 All Users Locked Permanently':'🔒 All Users Locked';
  updateCountdown();
  if(lockInterval) clearInterval(lockInterval);
  lockInterval=setInterval(updateCountdown,1000);
  if(!permanent){
    setTimeout(()=>{ globalLock.active=false; overlay.style.display='none'; clearInterval(lockInterval); }, sec*1000);
  }
};

function updateCountdown(){
  if(globalLock.active && globalLock.unlockTime){
    const remaining=Math.ceil((globalLock.unlockTime-Date.now())/1000);
    document.getElementById('countdownTimer').innerText = remaining>0?`Unlock in ${remaining} sec`:'';
  }
}

// -------------------- Global Message --------------------
window.showGlobalMessage = function(msg){
  const overlay=document.getElementById('globalLockOverlay');
  overlay.style.display='flex';
  document.getElementById('lockMessage').innerText = msg;
  document.getElementById('countdownTimer').innerText='';
  setTimeout(()=>overlay.style.display='none',3000);
};

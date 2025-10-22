// ----------------------
// MASTER COMMAND SYSTEM (Powerful Admin Control)
// ----------------------

// Import API functions
import { 
  getMasterCommands, addMasterCommand, editMasterCommand, deleteMasterCommand, 
  fetchLogs, saveLogs 
} from './api.js';

// Socket.IO connection
const socket = io();

// ----------------------
// GLOBAL STATE
// ----------------------
let masterCommands = [];
let warnings = {};
let loggedInUser = window.loggedInUser || { username:'guest', role:'student', badges:[], specialAccess:[] };
let commandInputBox = null;

// ----------------------
// PRELOADED COMMANDS
// ----------------------
const preCommands = [
  { id:'lock-temp', name:'Lock All Temporary', action:'lockAllUsersPrompt()', permission:'lock' },
  { id:'lock-perm', name:'Lock All Permanent', action:'lockAllUsers(0,true)', permission:'lock' },
  { id:'delete-last-test', name:'Delete Last Test', action:'deleteLastTest()', permission:'master' },
  { id:'restore-last-test', name:'Restore Last Deleted Test', action:'masterRestoreLastTest()', permission:'master' },
  { id:'global-broadcast', name:'Global Broadcast', action:'showGlobalMessage("This is a broadcast!")', permission:'admin' },
  { id:'highlight-message', name:'Highlight Message', action:'alert("Highlight executed!")', permission:'all' },
  { id:'sample', name:'Sample Test Command', action:'console.log("Sample Test Run")', permission:'all' }
];

// ----------------------
// INITIALIZATION
// ----------------------
document.addEventListener('DOMContentLoaded', async () => {
  // Set logged-in user if available globally
  loggedInUser = window.loggedInUser || loggedInUser;

  // Command input box
  commandInputBox = document.getElementById('masterCommandInput');
  if(commandInputBox){
    commandInputBox.addEventListener('keydown', e=>{
      if(e.key==='Enter'){
        executeCommandByName(commandInputBox.value.trim());
        commandInputBox.value='';
      }
    });
  }

  await loadMasterCommands();
  socket.on('masterCommandUpdated', loadMasterCommands);
});

// ----------------------
// LOAD COMMANDS
// ----------------------
export async function loadMasterCommands(){
  try {
    const cmds = await getMasterCommands();
    masterCommands = cmds.length ? cmds : preCommands;
  } catch(e){
    console.error('Failed to load master commands', e);
    masterCommands = [...preCommands];
  }
  renderMasterCommands();
}

// ----------------------
// RENDER COMMAND LIST
// ----------------------
export function renderMasterCommands(){
  const container = document.getElementById('masterList');
  if(!container) return;
  container.innerHTML = '';

  masterCommands.forEach(cmd => {
    const div = document.createElement('div');
    div.className = 'commandItem';
    div.innerHTML = `
      <strong>${cmd.name}</strong> | Permission: ${cmd.permission || 'all'}
      <button class="btn btn-primary" onclick="executeCommandById('${cmd.id}')">Execute</button>
      ${loggedInUser.role==='admin' ? `<button class="btn btn-ghost" onclick="editCommand('${cmd.id}')">Edit</button>
      <button class="btn btn-danger" onclick="deleteCommand('${cmd.id}')">Delete</button>` : ''}
    `;
    container.appendChild(div);
  });
}

// ----------------------
// EXECUTE COMMAND BY ID
// ----------------------
window.executeCommandById = function(id){
  const cmd = masterCommands.find(c => c.id === id);
  if(!cmd) return alert('Command not found');
  executeCommand(cmd);
};

// ----------------------
// EXECUTE COMMAND BY NAME (Input Box)
// ----------------------
function executeCommandByName(name){
  if(!name) return;
  const cmd = masterCommands.find(c => c.name.toLowerCase()===name.toLowerCase());
  if(!cmd){
    if(loggedInUser.role==='admin'){
      try{ eval(name); addLog(`Executed raw command by admin: ${name}`); } catch(e){ console.error(e); alert('Error executing command'); }
    } else {
      alert('Command not found or access denied');
    }
    return;
  }
  executeCommand(cmd);
}

// ----------------------
// EXECUTE COMMAND CORE
// ----------------------
function executeCommand(cmd){
  const isAdmin = loggedInUser.role==='admin';
  const hasPermission = isAdmin || cmd.permission==='all' || 
                        (cmd.permission==='badge' && loggedInUser.badges?.length) || 
                        loggedInUser.specialAccess?.includes(cmd.permission);

  if(!hasPermission){
    warnings[loggedInUser.username] = (warnings[loggedInUser.username] || 0) + 1;
    alert(`Access denied! Warning ${warnings[loggedInUser.username]}/5`);
    return;
  }

  try{
    eval(cmd.action);
    addLog(`Executed command "${cmd.name}" by ${loggedInUser.username}`);
    showCommandOverlay(cmd.name, loggedInUser.username);
    socket.emit('masterCommandExecuted', { id: cmd.id, user: loggedInUser.username });
  } catch(e){
    console.error('Command execution failed', e);
    alert('Command execution error');
  }
}

// ----------------------
// CREATE NEW COMMAND
// ----------------------
window.addNewCommand = async function(){
  if(loggedInUser.role!=='admin') return alert('Only admin can create commands');

  const name = prompt('Command Name'); 
  if(!name) return;
  const action = prompt('JavaScript Action'); 
  if(!action) return;
  const permission = prompt('Permission (all, badge, special access, lock, master, admin)', 'all');

  try{
    const newCmd = await addMasterCommand(name, action, permission);
    masterCommands.push(newCmd);
    renderMasterCommands();
    socket.emit('masterCommandUpdated');
  } catch(e){
    console.error('Failed to add command', e);
    alert('Failed to create command');
  }
};

// ----------------------
// EDIT COMMAND
// ----------------------
window.editCommand = async function(id){
  const cmd = masterCommands.find(c=>c.id===id);
  if(!cmd) return;
  const name = prompt('Command Name', cmd.name); if(name!==null) cmd.name=name;
  const action = prompt('JavaScript Action', cmd.action); if(action!==null) cmd.action=action;
  const permission = prompt('Permission', cmd.permission); if(permission!==null) cmd.permission=permission;

  try{
    const updated = await editMasterCommand(id, cmd.name, cmd.action, cmd.permission);
    const idx = masterCommands.findIndex(c=>c.id===id);
    masterCommands[idx] = updated;
    renderMasterCommands();
    socket.emit('masterCommandUpdated');
  } catch(e){
    console.error(e);
    alert('Failed to edit command');
  }
};

// ----------------------
// DELETE COMMAND
// ----------------------
window.deleteCommand = async function(id){
  if(!confirm('Delete this command?')) return;
  try{
    await deleteMasterCommand(id);
    masterCommands = masterCommands.filter(c=>c.id!==id);
    renderMasterCommands();
    socket.emit('masterCommandUpdated');
  } catch(e){
    console.error(e);
    alert('Failed to delete command');
  }
};

// ----------------------
// OVERLAY FOR COMMAND EXECUTION
// ----------------------
function showCommandOverlay(name, user){
  const overlay=document.createElement('div');
  overlay.id='commandOverlay';
  overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;color:white;font-size:2em;flex-direction:column;z-index:9999;';
  overlay.innerHTML=`⚡ ${name} executed by ${user} ⚡`;
  document.body.appendChild(overlay);
  overlay.animate([{opacity:0,transform:'scale(0.9)'},{opacity:1,transform:'scale(1)'}],{duration:400,fill:'forwards'});
  setTimeout(()=>overlay.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(0.9)'}],{duration:400,fill:'forwards'}).onfinish=()=>overlay.remove(),1500);
}

// ----------------------
// LOGGING
// ----------------------
async function addLog(msg){
  try{
    const logs = await fetchLogs();
    logs.unshift({ msg, time: new Date().toLocaleString() });
    await saveLogs(logs);
  } catch(e){ console.error('Failed to log message', e); }
}

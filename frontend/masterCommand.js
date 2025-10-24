import * as api from './api.js';
let masterCommands=[]; const socket=io(); let globalLock={active:false,unlockTime:null};

socket.on('master:created',cmd=>{masterCommands.push(cmd);renderMasterCommands();});
socket.on('master:updated',cmd=>{const idx=masterCommands.findIndex(c=>c.id===cmd.id);if(idx!==-1){masterCommands[idx]=cmd;renderMasterCommands();}});
socket.on('master:deleted',({id})=>{masterCommands=masterCommands.filter(c=>c.id!==id);renderMasterCommands();});
socket.on('locks:updated',lock=>{globalLock=lock;renderGlobalLockOverlay();});

async function loadData(){
  try{masterCommands=await api.getMasterCommands();}catch{masterCommands=[];} renderMasterCommands();
  try{globalLock=await api.getLocks();}catch{globalLock={active:false,unlockTime:null};} renderGlobalLockOverlay();
}
document.addEventListener('DOMContentLoaded',loadData);

function renderMasterCommands(){
  const container=document.getElementById('masterList');container.innerHTML='';
  if(!masterCommands.length){container.innerHTML='<div class="placeholder">No commands yet.</div>';return;}
  masterCommands.forEach(cmd=>{
    const div=document.createElement('div'); div.className='commandItem'; div.id=`cmd-${cmd.id}`;
    div.innerHTML=`<strong>${cmd.name}</strong> | Permission: ${cmd.permission||'all'}
      <div class="cmd-buttons">
        <button type="button" onclick="executeCommand('${cmd.id}')">Execute</button>
        <button type="button" onclick="editCommand('${cmd.id}')">Edit</button>
        <button type="button" onclick="deleteCommand('${cmd.id}')">Delete</button>
      </div>`;
    container.appendChild(div);
  });
}

window.addNewCommand=async function(){
  const name=prompt('Command Name'); if(!name) return;
  const action=prompt('JavaScript Action'); if(!action) return;
  const permission=prompt('Permission (all, admin, badge, special)','all');
  try{
    const newCmd=await api.addMasterCommand(name,action,permission);
    masterCommands.push(newCmd); renderMasterCommands(); socket.emit('master:created',newCmd);
    showGlobalMessage(`✨ Command "${name}" added!`,'success');
  }catch{alert('Failed to add command!');}
};

window.editCommand=async function(id){
  const cmd=masterCommands.find(c=>c.id===id); if(!cmd) return alert('Command not found');
  const newName=prompt('Edit Command Name:',cmd.name)||cmd.name;
  const newAction=prompt('Edit JavaScript Action:',cmd.action)||cmd.action;
  const newPermission=prompt('Edit Permission (all, admin, badge, special):',cmd.permission)||cmd.permission;
  try{
    const updatedCmd=await api.editMasterCommand(id,{name:newName,action:newAction,permission:newPermission});
    const idx=masterCommands.findIndex(c=>c.id===id); if(idx!==-1) masterCommands[idx]=updatedCmd;
    renderMasterCommands(); socket.emit('master:updated',updatedCmd); showGlobalMessage(`✏️ Command "${newName}" updated`,'info');
  }catch{alert('Failed to update command!');}
};

window.deleteCommand=async function(id){
  if(!confirm('Delete this command?')) return;
  try{
    await api.deleteMasterCommand(id);
    masterCommands=masterCommands.filter(c=>c.id!==id); renderMasterCommands(); socket.emit('master:deleted',{id});
    showGlobalMessage('🗑️ Command deleted','error');
  }catch{alert('Failed to delete command!');}
};

window.executeCommand=async function(id){
  try{
    const cmd=masterCommands.find(c=>c.id===id); if(!cmd) return;
    await api.executeMasterCommand(id,{actor:'admin'});
    socket.emit('master:execute',{id,actor:'admin'}); showGlobalMessage(`⚡ Command "${cmd.name}" executed!`,'success');
  }catch{alert('Failed to execute command!');}
};

function renderGlobalLockOverlay(){
  const overlay=document.getElementById('lockOverlay'); if(!overlay) return;
  overlay.style.display=globalLock.active?'flex':'none';
  if(globalLock.active) overlay.querySelector('#lockMsg').innerText='System is locked!';
}

function showGlobalMessage(msg,type='info'){
  const banner=document.createElement('div'); banner.className=`notification ${type}`; banner.innerText=msg; document.body.appendChild(banner);
  banner.animate([{transform:'translateY(-50px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:400});
  setTimeout(()=>{banner.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(-50px)',opacity:0}],{duration:400}).onfinish=()=>banner.remove();},2500);
}

import * as api from './api.js';
let chatbotTriggers = [], chatbotWarnings={}, chatbotLocked=false, chatbotUnlockTime=null, chatbotCountdown=null;
const preTriggers = [{trigger:"hello",response:"Hi! How can I help you?",type:"normal"},{trigger:"urgent",response:"Attention! This is an urgent alert!",type:"alert"}];
const socket = io();

socket.on('chatbot:updateTriggers', t=>{chatbotTriggers=t;renderTriggers();});
socket.on('chatbot:lock', ({seconds,message})=>lockChatbot(seconds,message));
socket.on('chatbot:unlock', ()=>unlockChatbot());

async function loadChatbotData(){
  try{chatbotTriggers=await api.getChatbotTriggers();chatbotWarnings={};} 
  catch{chatbotTriggers=[...preTriggers];}
  renderTriggers();
}

function renderTriggers(){
  const container = document.getElementById('triggerList'); if(!container) return;
  container.innerHTML='';
  if(!chatbotTriggers.length){container.innerHTML='<div class="placeholder">No triggers yet.</div>';return;}
  chatbotTriggers.forEach(tr=>{
    const div=document.createElement('div');
    div.innerHTML=`<strong>${tr.trigger}</strong> → ${tr.response} | Type: ${tr.type} 
      <button onclick="editTriggerAPI('${tr.id}')">Edit</button>
      <button onclick="deleteTriggerAPI('${tr.id}')">Delete</button>`;
    container.appendChild(div);
    setTimeout(()=>div.classList.add('fadeIn'),50);
  });
}

async function promptAddTrigger(){
  const trigger=prompt('Trigger keyword'); if(!trigger) return;
  const response=prompt('Response message'); if(!response) return;
  const type=prompt('Type: normal / alert / urgent / warning','normal');
  await addTriggerAPI(trigger,response,type);
}

async function addTriggerAPI(trigger,response,type='normal'){
  try{
    const newTrigger = await api.addChatbotTrigger(trigger,response,type);
    chatbotTriggers.push(newTrigger); renderTriggers();
    socket.emit('chatbot:triggerAdded', newTrigger);
  }catch{alert('Failed to add trigger!');}
}

async function editTriggerAPI(id){
  const tr=chatbotTriggers.find(t=>t.id===id); if(!tr) return;
  const t=prompt('Trigger',tr.trigger); if(t!==null) tr.trigger=t;
  const r=prompt('Response',tr.response); if(r!==null) tr.response=r;
  const ty=prompt('Type',tr.type); if(ty!==null) tr.type=ty;
  try{
    const updated = await api.editChatbotTrigger(id,tr.trigger,tr.response,tr.type);
    const idx=chatbotTriggers.findIndex(x=>x.id===id); chatbotTriggers[idx]=updated; renderTriggers();
    socket.emit('chatbot:triggerEdited',updated);
  }catch{alert('Failed to edit trigger!');}
}

async function deleteTriggerAPI(id){
  if(!confirm('Delete this trigger?')) return;
  try{
    await api.deleteChatbotTrigger(id);
    chatbotTriggers=chatbotTriggers.filter(t=>t.id!==id);
    renderTriggers();
    socket.emit('chatbot:triggerDeleted',id);
  }catch{alert('Failed to delete trigger!');}
}

function lockChatbot(seconds,msg='Chatbot Locked!'){
  chatbotLocked=true; chatbotUnlockTime=Date.now()+seconds*1000;
  const overlay=document.getElementById('chatbotOverlay'); overlay.style.display='flex';
  document.getElementById('chatbotMessage').innerText=msg;
  if(chatbotCountdown) clearInterval(chatbotCountdown);
  chatbotCountdown=setInterval(()=>{
    const remaining=Math.ceil((chatbotUnlockTime-Date.now())/1000);
    if(remaining<=0) unlockChatbot();
    else document.getElementById('chatbotMessage').innerText=`${msg} (Unlock in ${remaining}s)`;
  },1000);
  socket.emit('chatbot:lock',{seconds,message:msg});
}

function unlockChatbot(){
  chatbotLocked=false; chatbotUnlockTime=null;
  document.getElementById('chatbotOverlay').style.display='none';
  if(chatbotCountdown) clearInterval(chatbotCountdown);
  socket.emit('chatbot:unlock');
}

async function studentSendMessage(msg,username='student'){
  if(chatbotLocked) return alert('Chatbot is temporarily locked!');
  const tr=chatbotTriggers.find(t=>msg.toLowerCase().includes(t.trigger.toLowerCase()));
  if(tr){
    if(['alert','urgent','warning'].includes(tr.type)){
      lockChatbot(10,tr.response);
      chatbotWarnings[username]=(chatbotWarnings[username]||0)+1;
    }else alert(tr.response);
  }else alert('Chatbot: Sorry, I do not understand.');
}

document.addEventListener('DOMContentLoaded',loadChatbotData);
window.addTriggerAPI=addTriggerAPI; window.promptAddTrigger=promptAddTrigger;
window.editTriggerAPI=editTriggerAPI; window.deleteTriggerAPI=deleteTriggerAPI; window.studentSendMessage=studentSendMessage;

import { io } from "/socket.io/socket.io.js";
let notices=[], users=[]; const socket=io();

async function loadNoticeData(){
  try{ users=await fetchUsers(); notices=await fetchNotices(); renderNoticeTable(); } 
  catch(err){ console.error('Failed to load notices/users',err); }
}

const form=document.getElementById('addNoticeForm');
const publishSelect=document.getElementById('noticePublishSelect');
const studentContainer=document.getElementById('noticeStudentContainer');
const studentSelect=document.getElementById('noticeStudentSelect');
const tableBody=document.querySelector('#noticeTable tbody');

publishSelect.addEventListener('change',()=>{
  if(publishSelect.value==='specific'){ studentContainer.style.display='block'; renderStudentOptions(); }
  else studentContainer.style.display='none';
});

function renderStudentOptions(){
  studentSelect.innerHTML='';
  users.filter(u=>u.role==='student').forEach(s=>{
    const opt=document.createElement('option'); opt.value=s.username; opt.textContent=`${s.username} (${s.email})`; studentSelect.appendChild(opt);
  });
}

form.addEventListener('submit', async e=>{
  e.preventDefault();
  const title=document.getElementById('noticeTitle').value.trim();
  const message=document.getElementById('noticeMessage').value.trim();
  const publishTo=publishSelect.value;
  if(!title||!message) return alert('All fields are required.');

  let assignedStudents=[];
  if(publishTo==='all') assignedStudents=users.filter(u=>u.role==='student').map(s=>s.username);
  else assignedStudents=Array.from(studentSelect.selectedOptions).map(o=>o.value);

  const notice={title,message,assignedStudents};
  try{
    const savedNotice=await addNotice(notice); notices.push(savedNotice); form.reset(); studentContainer.style.display='none'; renderNoticeTable();
    showFloatingNotification('Notice published successfully!'); socket.emit('newNotice',savedNotice);
  } catch(err){ console.error(err); alert('Failed to publish notice!'); }
});

function renderNoticeTable(){
  tableBody.innerHTML='';
  notices.forEach(n=>{
    const publishedToText=n.assignedStudents.length===users.filter(u=>u.role==='student').length?'All Students':n.assignedStudents.join(',');
    const row=document.createElement('tr'); row.innerHTML=`
      <td>${n.title}</td>
      <td>${n.message}</td>
      <td>${publishedToText}</td>
      <td>
        <button onclick="editNoticeAPI('${n.id}')">✏️ Edit</button>
        <button onclick="deleteNoticeAPI('${n.id}')">🗑️ Delete</button>
      </td>`;
    tableBody.appendChild(row);
  });
}

async function editNoticeAPI(id){
  const n=notices.find(n=>n.id===id); if(!n) return;
  const newTitle=prompt('Edit Title:',n.title);
  const newMessage=prompt('Edit Message:',n.message);
  if(newTitle&&newMessage){
    try{
      const updated=await editNotice(id,{title:newTitle,message:newMessage});
      const idx=notices.findIndex(n=>n.id===id); notices[idx]=updated; renderNoticeTable(); showFloatingNotification('Notice updated successfully!');
      socket.emit('updateNotice',updated);
    } catch(err){ console.error(err); alert('Failed to update notice!'); }
  }
}

async function deleteNoticeAPI(id){
  if(!confirm('Delete this notice?')) return;
  try{ await deleteNotice(id); notices=notices.filter(n=>n.id!==id); renderNoticeTable(); showFloatingNotification('Notice deleted!');
  socket.emit('deleteNotice',id);} catch(err){ console.error(err); alert('Failed to delete notice!'); }
}

function showFloatingNotification(msg){
  const notif=document.createElement('div'); notif.className='floatingNotification'; notif.innerText=msg;
  document.getElementById('floatingContainer').appendChild(notif); setTimeout(()=>notif.remove(),3000);
}

socket.on('noticeAdded', notice=>{ notices.push(notice); renderNoticeTable(); });
socket.on('noticeUpdated', notice=>{ const idx=notices.findIndex(n=>n.id===notice.id); if(idx!==-1){ notices[idx]=notice; renderNoticeTable(); } });
socket.on('noticeDeleted', id=>{ notices=notices.filter(n=>n.id!==id); renderNoticeTable(); });

document.addEventListener('DOMContentLoaded',loadNoticeData);
window.editNoticeAPI

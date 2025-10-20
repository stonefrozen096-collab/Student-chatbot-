// JSON-based storage simulation (replace with actual file storage in server)
let badges = JSON.parse(localStorage.getItem('badges') || '[]');
let users = JSON.parse(localStorage.getItem('users') || '[]');

// ------------------ CREATE BADGE ------------------
document.getElementById('addBadgeForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('badgeName').value.trim();
  const effects = Array.from(document.getElementById('badgeEffects').selectedOptions).map(o=>o.value);
  const access = Array.from(document.getElementById('badgeAccess').selectedOptions).map(o=>o.value);

  if(!name) return alert('Enter badge name');

  badges.push({ name, effects, access });
  localStorage.setItem('badges', JSON.stringify(badges));
  renderBadges();
  e.target.reset();

  // Animation
  showBadgeStatus(`✅ Badge "${name}" created successfully!`);
});

// ------------------ RENDER BADGES ------------------
function renderBadges() {
  const div = document.getElementById('badgeList');
  div.innerHTML = '';
  badges.forEach((b, i) => {
    const d = document.createElement('div');
    d.className = 'badgeItem';
    d.innerHTML = `
      <span class="${b.effects.join(' ')}">${b.name}</span>
      [Effects: ${b.effects.join(', ')} | Access: ${b.access.join(', ')}]
      <button onclick="deleteBadge(${i})">🗑️ Delete</button>
    `;
    div.appendChild(d);
  });
  updateAssignBadgeSelect();
}

// ------------------ DELETE BADGE ------------------
function deleteBadge(index){
  if(!confirm('Delete this badge?')) return;
  badges.splice(index,1);
  localStorage.setItem('badges', JSON.stringify(badges));
  renderBadges();
}

// ------------------ ASSIGN BADGE ------------------
function updateAssignBadgeUser(){
  const sel = document.getElementById('assignBadgeUser');
  sel.innerHTML = '<option value="">Select User</option>';
  users.forEach(u=>{
    sel.insertAdjacentHTML('beforeend', `<option value="${u.username}">${u.name} (${u.username})</option>`);
  });
}
function updateAssignBadgeSelect(){
  const sel = document.getElementById('assignBadgeSelect');
  sel.innerHTML = '<option value="">Select Badge</option>';
  badges.forEach(b=>{
    sel.insertAdjacentHTML('beforeend', `<option value="${b.name}">${b.name}</option>`);
  });
}

document.getElementById('assignBadgeBtn').addEventListener('click', ()=>{
  const userName = document.getElementById('assignBadgeUser').value;
  const badgeName = document.getElementById('assignBadgeSelect').value;

  if(!userName || !badgeName) return alert('Select user and badge');

  const user = users.find(u=>u.username===userName);
  if(!user.badges) user.badges = [];
  if(!user.badges.includes(badgeName)) user.badges.push(badgeName);

  localStorage.setItem('users', JSON.stringify(users));
  showBadgeStatus(`✅ Badge "${badgeName}" assigned to ${user.name}`);
});

// ------------------ STATUS ANIMATION ------------------
function showBadgeStatus(msg){
  const status = document.getElementById('badgeStatus');
  status.innerText = msg;
  status.classList.add('badgeAnimation');
  setTimeout(()=> status.classList.remove('badgeAnimation'), 2000);
}

// ------------------ INITIALIZE ------------------
document.addEventListener('DOMContentLoaded', ()=>{
  renderBadges();
  updateAssignBadgeUser();
});

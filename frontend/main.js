// ---------- MAIN.JS — Updated + JSON-Based User Storage & Role-Based Redirect ----------
const socket = io();

socket.on("connect", () => console.log("✅ Connected to server via WebSocket"));
socket.on("disconnect", () => console.warn("⚠️ Disconnected from WebSocket"));

const themeToggle = document.getElementById("theme-toggle");
themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

const searchInput = document.getElementById("search-input");
searchInput?.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const items = document.querySelectorAll(".search-item");
  items.forEach(item => item.style.display = item.innerText.toLowerCase().includes(query) ? "" : "none");
});

function animateCounter(element, start = 0, end, duration = 1000) {
  let startTime = null;
  function step(currentTime) {
    if (!startTime) startTime = currentTime;
    const progress = Math.min((currentTime - startTime)/duration, 1);
    element.innerText = Math.floor(progress*(end-start)+start);
    if (progress<1) window.requestAnimationFrame(step);
  }
  window.requestAnimationFrame(step);
}

function showToast(message, type="success"){
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(()=>toast.remove(),3000);
}

function showFloatingNotification(msg, duration=3000){
  const notif = document.createElement("div");
  notif.className = "floatingNotification";
  notif.innerText = msg;
  document.getElementById("floatingContainer")?.appendChild(notif) || document.body.appendChild(notif);
  setTimeout(()=>notif.remove(),duration);
}

document.querySelectorAll(".collapsible").forEach(btn => {
  btn.addEventListener("click",()=>{
    btn.classList.toggle("active");
    const content = btn.nextElementSibling;
    if(content) content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight+"px";
  });
});

document.querySelectorAll('a[href^="#"]').forEach(anchor=>{
  anchor.addEventListener("click", e=>{
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute("href"));
    target?.scrollIntoView({behavior:"smooth"});
  });
});

const loginForm = document.getElementById("loginForm");
if(loginForm){
  loginForm.addEventListener("submit", async e=>{
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const statusDiv = document.getElementById("loginStatus") || document.getElementById("loginMsg");
    statusDiv.textContent = "Logging in...";
    statusDiv.style.color = "#555";

    try {
      const res = await fetch("/data/users.json");
      const users = await res.json();
      const user = users[email];
      if(!user) throw new Error("User not found");
      if(user.password !== password) throw new Error("Invalid password");

      statusDiv.textContent = "✅ Login successful! Redirecting...";
      statusDiv.style.color = "green";
      const role = user.role?.toLowerCase() || "student";
      let redirectPage = "student.html";
      switch(role){
        case "admin": redirectPage="admin.html"; break;
        case "moderator": redirectPage="moderator.html"; break;
        case "faculty": redirectPage="faculty.html"; break;
        case "tester": redirectPage="tester.html"; break;
      }
      window.currentUser = user;
      setTimeout(()=>window.location.href=`/${redirectPage}`,1000);
    } catch(err){
      console.error("Login error:",err);
      statusDiv.textContent = `❌ ${err.message || "Server error"}`;
      statusDiv.style.color = "red";
    }
  });
}

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".counter").forEach(el=>{
    const end = parseInt(el.getAttribute("data-count"),10)||0;
    animateCounter(el,0,end,1500);
  });
});

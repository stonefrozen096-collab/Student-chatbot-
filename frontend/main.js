// ---------- MAIN.JS — Connected to Render Backend (Login + Signup) ----------
const socket = io();
const API_URL = "https://feathers-26g1.onrender.com";

// WebSocket status logs
socket.on("connect", () => console.log("✅ Connected to server via WebSocket"));
socket.on("disconnect", () => console.warn("⚠️ Disconnected from WebSocket"));

// ---------- THEME TOGGLE ----------
const themeToggle = document.getElementById("theme-toggle");
themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

// ---------- SEARCH FILTER ----------
const searchInput = document.getElementById("search-input");
searchInput?.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const items = document.querySelectorAll(".search-item");
  items.forEach(item => {
    item.style.display = item.innerText.toLowerCase().includes(query) ? "" : "none";
  });
});

// ---------- COUNTER ANIMATION ----------
function animateCounter(element, start = 0, end, duration = 1000) {
  let startTime = null;
  function step(currentTime) {
    if (!startTime) startTime = currentTime;
    const progress = Math.min((currentTime - startTime) / duration, 1);
    element.innerText = Math.floor(progress * (end - start) + start);
    if (progress < 1) window.requestAnimationFrame(step);
  }
  window.requestAnimationFrame(step);
}

// ---------- TOAST MESSAGE ----------
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ---------- FLOATING NOTIFICATION ----------
function showFloatingNotification(msg, duration = 3000) {
  const notif = document.createElement("div");
  notif.className = "floatingNotification";
  notif.innerText = msg;
  document.getElementById("floatingContainer")?.appendChild(notif) || document.body.appendChild(notif);
  setTimeout(() => notif.remove(), duration);
}

// ---------- COLLAPSIBLE SECTIONS ----------
document.querySelectorAll(".collapsible").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("active");
    const content = btn.nextElementSibling;
    if (content) content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
  });
});

// ---------- SMOOTH SCROLL ----------
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", e => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute("href"));
    target?.scrollIntoView({ behavior: "smooth" });
  });
});

// ---------- LOGIN ----------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const statusDiv = document.getElementById("loginStatus") || document.getElementById("loginMsg");
    statusDiv.textContent = "Logging in...";
    statusDiv.style.color = "#555";

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      statusDiv.textContent = "✅ Login successful! Redirecting...";
      statusDiv.style.color = "green";

      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", data.user.role);

      // Redirect by role
      let redirectPage = "student.html";
      switch (data.user.role.toLowerCase()) {
        case "admin": redirectPage = "admin.html"; break;
        case "moderator": redirectPage = "moderator.html"; break;
        case "faculty": redirectPage = "faculty.html"; break;
        case "tester": redirectPage = "tester.html"; break;
      }

      setTimeout(() => window.location.href = `/${redirectPage}`, 1000);
    } catch (err) {
      console.error("Login error:", err);
      statusDiv.textContent = `❌ ${err.message || "Server error"}`;
      statusDiv.style.color = "red";
    }
  });
}

// ---------- SIGNUP ----------
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async e => {
    e.preventDefault();
    const fullName = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = "student"; // Default role
    const statusDiv = document.getElementById("signupStatus") || document.getElementById("signupMsg");
    statusDiv.textContent = "Creating account...";
    statusDiv.style.color = "#555";

    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, role })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      statusDiv.textContent = "✅ Account created successfully! Redirecting...";
      statusDiv.style.color = "green";
      setTimeout(() => window.location.href = "/login.html", 1000);
    } catch (err) {
      console.error("Signup error:", err);
      statusDiv.textContent = `❌ ${err.message || "Server error"}`;
      statusDiv.style.color = "red";
    }
  });
}

// ---------- COUNTER INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".counter").forEach(el => {
    const end = parseInt(el.getAttribute("data-count"), 10) || 0;
    animateCounter(el, 0, end, 1500);
  });
});

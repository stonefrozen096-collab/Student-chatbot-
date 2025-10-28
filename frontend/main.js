// ---------- MAIN.JS — Complete Auth (Login + Signup + Forgot + Reset + Logout) ----------
const socket = io();
const API_URL = "https://feathers-26g1.onrender.com";

// ---------- SOCKET STATUS ----------
socket.on("connect", () => console.log("✅ Connected to WebSocket"));
socket.on("disconnect", () => console.warn("⚠️ WebSocket disconnected"));

// ---------- THEME TOGGLE ----------
const themeToggle = document.getElementById("theme-toggle");
themeToggle?.addEventListener("click", () => document.body.classList.toggle("dark-mode"));

// ---------- SEARCH FILTER ----------
const searchInput = document.getElementById("search-input");
searchInput?.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  document.querySelectorAll(".search-item").forEach(item => {
    item.style.display = item.innerText.toLowerCase().includes(query) ? "" : "none";
  });
});

// ---------- TOAST FUNCTION ----------
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

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

      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", data.user.role);

      statusDiv.textContent = "✅ Login successful! Redirecting...";
      statusDiv.style.color = "green";

      let redirectPage = "student.html";
      switch (data.user.role.toLowerCase()) {
        case "admin": redirectPage = "admin.html"; break;
        case "moderator": redirectPage = "moderator.html"; break;
        case "faculty": redirectPage = "faculty.html"; break;
        case "tester": redirectPage = "tester.html"; break;
      }

      setTimeout(() => (window.location.href = `/${redirectPage}`), 1000);
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
    const role = "student";
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

      statusDiv.textContent = "✅ Account created successfully!";
      statusDiv.style.color = "green";
      setTimeout(() => (window.location.href = "/login.html"), 1000);
    } catch (err) {
      console.error("Signup error:", err);
      statusDiv.textContent = `❌ ${err.message || "Server error"}`;
      statusDiv.style.color = "red";
    }
  });
}

// ---------- FORGOT PASSWORD ----------
const forgotForm = document.getElementById("forgotForm");
if (forgotForm) {
  forgotForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("forgotEmail").value.trim();
    const statusDiv = document.getElementById("forgotStatus");
    statusDiv.textContent = "Sending reset link...";
    statusDiv.style.color = "#555";

    try {
      const res = await fetch(`${API_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reset link");

      statusDiv.textContent = "✅ Reset link sent! Check your email.";
      statusDiv.style.color = "green";
    } catch (err) {
      console.error("Forgot password error:", err);
      statusDiv.textContent = `❌ ${err.message || "Server error"}`;
      statusDiv.style.color = "red";
    }
  });
}

// ---------- RESET PASSWORD ----------
const resetForm = document.getElementById("resetForm");
if (resetForm) {
  resetForm.addEventListener("submit", async e => {
    e.preventDefault();
    const token = new URLSearchParams(window.location.search).get("token");
    const newPassword = document.getElementById("newPassword").value.trim();
    const statusDiv = document.getElementById("resetStatus");
    statusDiv.textContent = "Resetting password...";
    statusDiv.style.color = "#555";

    try {
      const res = await fetch(`${API_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");

      statusDiv.textContent = "✅ Password reset successful! Redirecting...";
      statusDiv.style.color = "green";
      setTimeout(() => (window.location.href = "/login.html"), 1500);
    } catch (err) {
      console.error("Reset error:", err);
      statusDiv.textContent = `❌ ${err.message || "Server error"}`;
      statusDiv.style.color = "red";
    }
  });
}

// ---------- LOGOUT ----------
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    showToast("👋 Logged out successfully!");
    setTimeout(() => (window.location.href = "/login.html"), 800);
  });
}

// ---------- COUNTER INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".counter").forEach(el => {
    const end = parseInt(el.getAttribute("data-count"), 10) || 0;
    animateCounter(el, 0, end, 1500);
  });
});

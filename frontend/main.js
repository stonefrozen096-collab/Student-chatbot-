// ==================================================
// ✅ MAIN.JS — FINAL PRODUCTION VERSION (UPGRADED)
// Backend: https://feathers-26g1.onrender.com
// ==================================================

// ---------- SOCKET.IO CONNECTION ----------
const socket = io("https://feathers-26g1.onrender.com", {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

const API_URL = "https://feathers-26g1.onrender.com";

// ---------- SOCKET TEST ----------
socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
  socket.emit("pingFromClient", { msg: "Hello from frontend 👋" });
});
socket.on("disconnect", (reason) => console.warn("⚠️ Socket disconnected:", reason));
socket.on("pongFromServer", (data) => console.log("📩 Reply from backend:", data));

// Live updates (optional)
socket.on("noticeAdded", (data) => console.log("📰 New Notice:", data));
socket.on("attendanceUpdated", (data) => console.log("📡 Attendance updated:", data));
socket.on("chatbotTriggerAdded", (data) => console.log("🤖 Chatbot trigger added:", data));

// ---------- BACKEND REACH TEST ----------
(async () => {
  try {
    const res = await fetch(`${API_URL}/health`);
    if (res.ok) console.log("🌐 Backend reachable:", API_URL);
    else console.warn("⚠️ Backend responded but not OK:", res.status);
  } catch (err) {
    console.error("❌ Cannot reach backend:", err.message);
  }
})();

// ==================================================
// 🌙 THEME TOGGLE (Dark Mode with Blue Glow + Cookie Save)
// ==================================================
const themeToggle = document.getElementById("theme-toggle");

// 🔹 Load theme preference from cookies
const savedTheme = document.cookie
  .split("; ")
  .find((row) => row.startsWith("theme="))
  ?.split("=")[1];
if (savedTheme === "dark") document.body.classList.add("dark-mode");

function saveThemeToCookie(theme) {
  document.cookie = `theme=${theme}; path=/; max-age=${60 * 60 * 24 * 30}`;
}

themeToggle?.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-mode");
  saveThemeToCookie(isDark ? "dark" : "light");

  // Add a smooth glowing fade when switching to dark
  if (isDark) {
    const glow = document.createElement("div");
    glow.className = "blue-glow";
    document.body.appendChild(glow);
    setTimeout(() => glow.classList.add("fade-in"), 50);
    setTimeout(() => glow.classList.remove("fade-in"), 1500);
    setTimeout(() => glow.remove(), 1800);
  }
});

// ==================================================
// 🔍 SEARCH FILTER
// ==================================================
const searchInput = document.getElementById("search-input");
searchInput?.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  document.querySelectorAll(".search-item").forEach((item) => {
    item.style.display = item.innerText.toLowerCase().includes(query) ? "" : "none";
  });
});

// ==================================================
// 🔢 COUNTER ANIMATION
// ==================================================
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

// ==================================================
// 🔔 TOAST MESSAGE
// ==================================================
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ==================================================
// 🔑 LOGIN
// ==================================================
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const statusDiv = document.getElementById("loginStatus") || document.getElementById("loginMsg");
    statusDiv.textContent = "Logging in...";

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", data.user?.role || "student");

      // Analytics ping (non-blocking)
      fetch(`${API_URL}/api/analytics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "login_success", email }),
      }).catch(() => {});

      statusDiv.textContent = "✅ Login successful! Redirecting...";
      statusDiv.style.color = "green";

      const role = (data.user?.role || "student").toLowerCase();
      const redirects = {
        admin: "/dashboard.html",
        moderator: "moderator.html",
        faculty: "faculty.html",
        tester: "tester.html",
        student: "student.html",
      };
      setTimeout(() => (window.location.href = `${redirects[role] || "student.html"}`), 1000);
    } catch (err) {
      console.error("Login error:", err);
      statusDiv.textContent = `❌ ${err.message}`;
      statusDiv.style.color = "red";
    }
  });
}

// ==================================================
// 🧾 SIGNUP
// ==================================================
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = "student";
    const statusDiv = document.getElementById("signupStatus") || document.getElementById("signupMsg");

    statusDiv.textContent = "Creating account...";
    statusDiv.style.color = "#555";

    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, email, password, role }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        statusDiv.textContent = "✅ Account created successfully!";
        statusDiv.style.color = "green";

        fetch(`${API_URL}/api/analytics`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "signup_success", email }),
        }).catch(() => {});

        setTimeout(() => (window.location.href = "login.html"), 1500);
      } else {
        let msg = data.error || data.message || "Signup failed.";
        statusDiv.textContent = `❌ ${msg}`;
        statusDiv.style.color = "red";
      }
    } catch (err) {
      console.error("Signup error:", err);
      statusDiv.textContent = `❌ ${err.message}`;
      statusDiv.style.color = "red";
    }
  });
}

// ==================================================
// 🔐 FORGOT PASSWORD
// ==================================================
const forgotForm = document.getElementById("forgotForm");
if (forgotForm) {
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgotEmail").value.trim();
    const msgDiv = document.getElementById("forgotMsg");
    msgDiv.textContent = "Requesting reset link...";

    try {
      const res = await fetch(`${API_URL}/api/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to send token");

      msgDiv.style.color = "green";
      msgDiv.textContent = "✅ Token sent to your email!";
      if (data.debugCode) console.log("DEBUG Reset Code:", data.debugCode);
    } catch (err) {
      msgDiv.style.color = "red";
      msgDiv.textContent = `❌ ${err.message}`;
    }
  });
}

// ==================================================
// 🔑 RESET PASSWORD
// ==================================================
const resetForm = document.getElementById("resetForm");
if (resetForm) {
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("resetEmail").value.trim();
    const code = document.getElementById("resetCode").value.trim();
    const newPassword = document.getElementById("resetPassword").value.trim();
    const msgDiv = document.getElementById("resetMsg");
    msgDiv.textContent = "Resetting password...";

    try {
      const res = await fetch(`${API_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Reset failed");

      msgDiv.style.color = "green";
      msgDiv.textContent = "✅ Password reset successful! Redirecting...";
      setTimeout(() => (window.location.href = "login.html"), 1500);
    } catch (err) {
      msgDiv.style.color = "red";
      msgDiv.textContent = `❌ ${err.message}`;
    }
  });
}

// ==================================================
// 🚪 LOGOUT (With Confirmation Dialog)
// ==================================================
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    const box = confirm("Are you sure you want to logout?");
    if (!box) return;
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    showToast("Logged out successfully", "info");
    setTimeout(() => (window.location.href = "login.html"), 1000);
  });
}

// ==================================================
// 🔢 INIT COUNTERS ON PAGE LOAD
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".counter").forEach((el) => {
    const end = parseInt(el.getAttribute("data-count"), 10) || 0;
    animateCounter(el, 0, end, 1500);
  });
});

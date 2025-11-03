// ==================================================
// ✅ MAIN.JS — FINAL PRODUCTION VERSION (UPGRADED + FIXED REDIRECTS & PROTECTION)
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
// 🔐 ROLE-BASED PROTECTED ROUTES + SESSION AUTO LOGOUT
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
  const publicPages = ["login.html", "signup.html", "forgot.html", "reset.html", ""];
  const currentPage = window.location.pathname.split("/").pop();
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("userRole") || "").toLowerCase();

  const rolePages = {
    admin: ["dashboard.html"],
    moderator: ["moderator.html"],
    faculty: ["faculty.html"],
    tester: ["tester.html"],
    student: ["student.html"],
  };

  // 🚫 Block access to protected pages without login
  if (!publicPages.includes(currentPage) && !token) {
    console.warn("🔒 Unauthorized access — redirecting to login.");
    window.location.href = "login.html";
    return;
  }

  // 🔁 Redirect logged-in users away from login/signup pages
  if (publicPages.includes(currentPage) && token) {
    const defaultPage = rolePages[role]?.[0] || "student.html";
    console.log(`🔁 Already logged in as ${role}, redirecting to ${defaultPage}`);
    window.location.href = defaultPage;
    return;
  }

  // 🧭 Role mismatch protection
  if (token && !publicPages.includes(currentPage)) {
    let allowed = false;
    for (const [r, pages] of Object.entries(rolePages)) {
      if (r === role && pages.includes(currentPage)) {
        allowed = true;
        break;
      }
    }

    if (!allowed) {
      console.warn(`🚫 ${role} not allowed to access ${currentPage}. Redirecting...`);
      const redirectPage = rolePages[role]?.[0] || "student.html";
      window.location.href = redirectPage;
      return;
    }
  }

  // ==================================================
  // ⏰ SESSION AUTO LOGOUT (1 hour)
  // ==================================================
  const SESSION_DURATION = 60 * 60 * 1000; // 1 hour
  const lastLogin = localStorage.getItem("loginTime");

  if (token && !lastLogin) {
    localStorage.setItem("loginTime", Date.now().toString());
  }

  if (token) {
    setInterval(() => {
      const loginTime = parseInt(localStorage.getItem("loginTime") || "0", 10);
      const now = Date.now();
      if (now - loginTime >= SESSION_DURATION) {
        showSessionExpiredDialog();
      }
    }, 60000);
  }

  // 💜 Purple Neon Session Expired Dialog
  function showSessionExpiredDialog() {
    if (document.getElementById("session-expired-box")) return;

    const box = document.createElement("div");
    box.id = "session-expired-box";
    box.innerHTML = `
      <div class="session-overlay"></div>
      <div class="session-dialog">
        <h3>⚡ Session Expired</h3>
        <p>Your session has ended for security reasons.<br>Please log in again.</p>
        <button id="session-ok-btn">Re-Login</button>
      </div>
    `;
    document.body.appendChild(box);

    // 💜 Matching purple neon styles
    const style = document.createElement("style");
    style.textContent = `
      .session-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px);
        z-index: 9998;
        animation: fadeInBg 0.3s ease;
      }
      .session-dialog {
        position: fixed; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle at top, #1a002b 0%, #090011 100%);
        color: #e6dbff;
        padding: 30px 45px;
        border-radius: 18px;
        box-shadow: 0 0 25px rgba(162, 70, 255, 0.8), inset 0 0 15px rgba(180, 80, 255, 0.3);
        text-align: center;
        z-index: 9999;
        animation: popUp 0.4s ease-out;
      }
      .session-dialog h3 {
        color: #bb86fc;
        text-shadow: 0 0 10px #b57aff, 0 0 20px #a055ff;
        margin-bottom: 10px;
        font-size: 1.4rem;
        font-weight: 600;
      }
      .session-dialog p {
        font-size: 0.95rem;
        color: #d9caff;
        margin-bottom: 20px;
        line-height: 1.4;
      }
      .session-dialog button {
        background: linear-gradient(135deg, #a055ff, #bb86fc);
        color: #fff;
        border: none;
        padding: 10px 22px;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 0 18px rgba(187, 134, 252, 0.9);
        transition: all 0.2s ease-in-out;
      }
      .session-dialog button:hover {
        transform: scale(1.07);
        box-shadow: 0 0 25px rgba(187, 134, 252, 1);
        background: linear-gradient(135deg, #b784ff, #d0a2ff);
      }
      @keyframes fadeInBg {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes popUp {
        from { opacity: 0; transform: translate(-50%, -46%) scale(0.9); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
    `;
    document.head.appendChild(style);

    document.getElementById("session-ok-btn").addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("loginTime");
      window.location.href = "login.html";
    });
  }
});
// ==================================================
// 🌙 THEME TOGGLE (Dark Mode with Purple Neon Glow + Cookie Save)
// ==================================================
const themeToggle = document.getElementById("theme-toggle");

// 🔹 Load previously saved theme from cookie
const savedTheme = document.cookie
  .split("; ")
  .find((row) => row.startsWith("theme="))
  ?.split("=")[1];
if (savedTheme === "dark") document.body.classList.add("dark-mode");

// 🔹 Save theme preference in cookie
function saveThemeToCookie(theme) {
  document.cookie = `theme=${theme}; path=/; max-age=${60 * 60 * 24 * 30}`;
}

// 🔹 Toggle dark mode
themeToggle?.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-mode");
  saveThemeToCookie(isDark ? "dark" : "light");

  // 💜 Add temporary purple glow burst effect when toggled on
  if (isDark) {
    const glow = document.createElement("div");
    glow.className = "purple-glow";
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

      statusDiv.textContent = "✅ Login successful! Redirecting...";
      statusDiv.style.color = "green";

      const role = (data.user?.role || "student").toLowerCase();
      const redirects = {
        admin: "dashboard.html",
        moderator: "moderator.html",
        faculty: "faculty.html",
        tester: "tester.html",
        student: "student.html",
      };
      setTimeout(() => (window.location.href = redirects[role] || "student.html"), 1000);
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

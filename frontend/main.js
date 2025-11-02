// ---------- MAIN.JS — Full (Login + Signup + Forgot + Reset + Logout) ----------
const socket = io();
const API_URL = "https://feathers-26g1.onrender.com";

// ---------- SOCKET STATUS ----------
socket.on("connect", () => console.log("✅ Connected to server"));
socket.on("disconnect", () => console.warn("⚠️ Disconnected from server"));

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

// ---------- TOAST ----------
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
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

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", data.user?.role || "student");

      statusDiv.textContent = "✅ Login successful! Redirecting...";
      statusDiv.style.color = "green";

      let redirectPage = "student.html";
      switch ((data.user?.role || "").toLowerCase()) {
        case "admin": redirectPage = "admin.html"; break;
        case "moderator": redirectPage = "moderator.html"; break;
        case "faculty": redirectPage = "faculty.html"; break;
        case "tester": redirectPage = "tester.html"; break;
      }
      setTimeout(() => (window.location.href = `/${redirectPage}`), 1000);
    } catch (err) {
      console.error("Login error:", err);
      statusDiv.textContent = `❌ ${err.message}`;
      statusDiv.style.color = "red";
    }
  });
}

// ---------- SIGNUP ----------
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = "student";
    const statusDiv =
      document.getElementById("signupStatus") ||
      document.getElementById("signupMsg");

    statusDiv.textContent = "Creating account...";
    statusDiv.style.color = "#555";

    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, email, password, role }),
      });

      const data = await res.json();
      alert("Signup response: " + JSON.stringify(data, null, 2));

      if (res.ok && data.success) {
        statusDiv.textContent = "✅ Account created successfully!";
        statusDiv.style.color = "green";
        setTimeout(() => (window.location.href = "login.html"), 1500);
      } else {
        let msg = "Signup failed.";
        if (Array.isArray(data.error)) {
          msg = data.error.map(e => e.msg || e).join(", ");
        } else if (data.error && typeof data.error === "object") {
          msg =
            data.error.msg ||
            Object.values(data.error)
              .map(v => (typeof v === "object" ? JSON.stringify(v) : v))
              .join(", ");
        } else if (typeof data.error === "string") {
          msg = data.error;
        } else if (data.message) {
          msg = data.message;
        }

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

// ---------- FORGOT PASSWORD ----------
const forgotForm = document.getElementById("forgotForm");
if (forgotForm) {
  forgotForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("forgotEmail").value.trim();
    const msgDiv = document.getElementById("forgotMsg");
    msgDiv.textContent = "Requesting reset link...";

    try {
      const res = await fetch(`${API_URL}/api/request-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
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

// ---------- RESET PASSWORD ----------
const resetForm = document.getElementById("resetForm");
if (resetForm) {
  resetForm.addEventListener("submit", async e => {
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
        body: JSON.stringify({ email, code, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Reset failed");

      msgDiv.style.color = "green";
      msgDiv.textContent = "✅ Password reset successful! Redirecting...";
      setTimeout(() => (window.location.href = "/login.html"), 1500);
    } catch (err) {
      msgDiv.style.color = "red";
      msgDiv.textContent = `❌ ${err.message}`;
    }
  });
}

// ---------- LOGOUT ----------
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    showToast("Logged out successfully", "info");
    setTimeout(() => (window.location.href = "/login.html"), 1000);
  });
}

// ---------- COUNTER INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".counter").forEach(el => {
    const end = parseInt(el.getAttribute("data-count"), 10) || 0;
    animateCounter(el, 0, end, 1500);
  });
});

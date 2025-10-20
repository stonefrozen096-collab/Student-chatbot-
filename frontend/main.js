// main.js

// ----------------------
// Theme toggle (Light/Dark)
// ----------------------
const themeToggle = document.getElementById("theme-toggle");
themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  // Theme state can now be saved via API if needed
});

// Load saved theme from server if available
// You can replace this with an API call to fetch user preferences

// ----------------------
// Search functionality
// ----------------------
const searchInput = document.getElementById("search-input");

searchInput?.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const items = document.querySelectorAll(".search-item");
  items.forEach((item) => {
    item.style.display = item.innerText.toLowerCase().includes(query) ? "" : "none";
  });
});

// ----------------------
// Animated counters (ex: attendance, exams, notices)
// ----------------------
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

// ----------------------
// Toast notifications
// ----------------------
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ----------------------
// Collapsible sections
// ----------------------
document.querySelectorAll(".collapsible").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("active");
    const content = btn.nextElementSibling;
    if (content) {
      content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px";
    }
  });
});

// ----------------------
// Smooth scrolling for internal links
// ----------------------
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute("href"));
    target?.scrollIntoView({ behavior: "smooth" });
  });
});

// ----------------------
// Floating notification utility
// ----------------------
function showFloatingNotification(msg, duration = 3000) {
  const notif = document.createElement("div");
  notif.className = "floatingNotification";
  notif.innerText = msg;
  document.getElementById('floatingContainer')?.appendChild(notif) || document.body.appendChild(notif);
  setTimeout(() => notif.remove(), duration);
}

// ----------------------
// Initialize
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".counter").forEach((el) => {
    const end = parseInt(el.getAttribute("data-count"), 10) || 0;
    animateCounter(el, 0, end, 1500);
  });
});

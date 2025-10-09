// main.js

// ----------------------
// Theme toggle (Light/Dark)
// ----------------------
const themeToggle = document.getElementById("theme-toggle");
themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark-mode") ? "dark" : "light"
  );
});

// Load saved theme
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark-mode");
}

// ----------------------
// Search functionality
// ----------------------
const searchInput = document.getElementById("search-input");
const searchResultsContainer = document.getElementById("search-results");

searchInput?.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const items = document.querySelectorAll(".search-item");
  items.forEach((item) => {
    if (item.innerText.toLowerCase().includes(query)) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
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

// Example usage for counters
document.querySelectorAll(".counter").forEach((el) => {
  const end = parseInt(el.getAttribute("data-count"), 10);
  animateCounter(el, 0, end, 1500);
});

// ----------------------
// Toast notifications
// ----------------------
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ----------------------
// Collapsible sections
// ----------------------
document.querySelectorAll(".collapsible").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("active");
    const content = btn.nextElementSibling;
    if (content.style.maxHeight) {
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
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

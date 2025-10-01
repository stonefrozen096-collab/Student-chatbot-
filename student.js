// student.js

// Chatbot Elements
const chatbox = document.getElementById("chatbox");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

// Function to append messages
function addMessage(sender, text) {
  const msg = document.createElement("div");
  msg.classList.add("chat-message", sender);
  msg.innerText = text;
  chatbox.appendChild(msg);
  chatbox.scrollTop = chatbox.scrollHeight;
}

// Predefined responses
const responses = {
  "hello": "Hi there 👋 How can I help you today?",
  "attendance": "📊 Your overall attendance is 88%. Math: 93%, Physics: 87%, Mechanical: 83%.",
  "exam": "📅 Next exam is Math - Unit Test on 20th Oct, 10:00 AM.",
  "notes": "📘 Available notes: Math (Integration.pdf), Physics (Thermodynamics.docx), Mechanical (CAD.zip).",
  "assignment": "📝 Assignments: CAD Model (Oct 5), Thermodynamics Report (Oct 10).",
  "help": "I can tell you about your attendance, exams, assignments, and notes.",
  "bye": "Goodbye 👋 Have a great day!"
};

// Handle chatbot submission
chatForm.addEventListener("submit", function(e) {
  e.preventDefault();
  const userText = chatInput.value.trim();
  if (!userText) return;

  // Show user message
  addMessage("user", userText);

  // Bot typing simulation
  setTimeout(() => {
    const lower = userText.toLowerCase();
    let reply = "🤖 Sorry, I don't understand. Try 'attendance', 'exam', 'notes', or 'help'.";
    for (let key in responses) {
      if (lower.includes(key)) {
        reply = responses[key];
        break;
      }
    }
    addMessage("bot", reply);
  }, 600);

  chatInput.value = "";
});

// Extra: Section toggle (smooth scroll)
document.querySelectorAll("nav a").forEach(link => {
  link.addEventListener("click", function(e) {
    e.preventDefault();
    document.querySelector(this.getAttribute("href"))
      .scrollIntoView({ behavior: "smooth" });
  });
});
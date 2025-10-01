// faculty.js

document.addEventListener("DOMContentLoaded", () => {
  const addNoteForm = document.getElementById("addNoteForm");
  const markAttendanceForm = document.getElementById("markAttendanceForm");
  const addAssignmentForm = document.getElementById("addAssignmentForm");
  const feedbackForm = document.getElementById("feedbackForm");

  const chatWindow = document.getElementById("chatWindow");
  const chatInput = document.getElementById("chatInput");
  const sendChatBtn = document.getElementById("sendChat");

  const API_BASE = "http://localhost:3000"; // change if deployed

  // ------------------------
  // Add Note
  // ------------------------
  addNoteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentReg = document.getElementById("studentReg").value.trim();
    const noteContent = document.getElementById("noteContent").value.trim();
    const publicNote = document.getElementById("publicNote").checked;

    if (!studentReg || !noteContent) return alert("Fill all fields");

    try {
      const res = await fetch(`${API_BASE}/faculty/add-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentReg, faculty: "faculty1", note: noteContent, publicNote }),
      });
      const data = await res.json();
      alert(data.msg);
      addNoteForm.reset();
    } catch (err) {
      console.error(err);
      alert("Error adding note");
    }
  });

  // ------------------------
  // Mark Attendance
  // ------------------------
  markAttendanceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentReg = document.getElementById("attendanceReg").value.trim();
    const subject = document.getElementById("subject").value.trim();
    const percentage = document.getElementById("percentage").value;

    if (!studentReg || !subject || !percentage) return alert("Fill all fields");

    try {
      const res = await fetch(`${API_BASE}/faculty/mark-attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentReg, subject, percentage, faculty: "faculty1" }),
      });
      const data = await res.json();
      alert(data.msg);
      markAttendanceForm.reset();
    } catch (err) {
      console.error(err);
      alert("Error updating attendance");
    }
  });

  // ------------------------
  // Add Assignment
  // ------------------------
  addAssignmentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentReg = document.getElementById("assignmentStudent").value.trim();
    const fileInput = document.getElementById("assignmentFile");
    const file = fileInput.files[0];
    if (!studentReg || !file) return alert("Fill all fields");

    // Convert file to Base64
    const reader = new FileReader();
    reader.onload = async () => {
      const fileData = reader.result;
      try {
        const res = await fetch(`${API_BASE}/faculty/add-assignment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentReg, faculty: "faculty1", file: fileData }),
        });
        const data = await res.json();
        alert(data.msg);
        addAssignmentForm.reset();
      } catch (err) {
        console.error(err);
        alert("Error uploading assignment");
      }
    };
    reader.readAsDataURL(file);
  });

  // ------------------------
  // Feedback
  // ------------------------
  feedbackForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = document.getElementById("feedbackMessage").value.trim();
    if (!message) return alert("Enter feedback message");

    try {
      const res = await fetch(`${API_BASE}/faculty/message-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faculty: "faculty1", message }),
      });
      const data = await res.json();
      alert(data.msg);
      feedbackForm.reset();
    } catch (err) {
      console.error(err);
      alert("Error sending feedback");
    }
  });

  // ------------------------
  // Chatbot
  // ------------------------
  sendChatBtn.addEventListener("click", sendMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    appendMessage("You", message);
    chatInput.value = "";

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      appendMessage("Bot", data.reply);
    } catch (err) {
      console.error(err);
      appendMessage("Bot", "Error: Could not get response");
    }
  }

  function appendMessage(sender, text) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("chat-message");
    msgDiv.classList.add(sender === "Bot" ? "bot-msg" : "user-msg");
    msgDiv.textContent = `${sender}: ${text}`;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});
// faculty.js

// Elements
const addNoteForm = document.getElementById("add-note-form");
const attendanceForm = document.getElementById("attendance-form");
const assignmentForm = document.getElementById("assignment-form");
const messageForm = document.getElementById("message-form");
const feedbackBox = document.getElementById("feedback-box");

// Utility function to show messages
function showMessage(msg, type = "success") {
  const div = document.createElement("div");
  div.className = `alert ${type}`;
  div.innerText = msg;
  feedbackBox.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// ----------------------
// Add Note
// ----------------------
if(addNoteForm) {
  addNoteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentReg = addNoteForm["studentReg"].value;
    const note = addNoteForm["note"].value;
    const publicNote = addNoteForm["publicNote"].checked;

    const res = await addNote(studentReg, note, publicNote);
    if(res.msg) showMessage(res.msg);
    addNoteForm.reset();
  });
}

// ----------------------
// Mark Attendance
// ----------------------
if(attendanceForm) {
  attendanceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentReg = attendanceForm["studentReg"].value;
    const subject = attendanceForm["subject"].value;
    const percentage = attendanceForm["percentage"].value;

    const res = await markAttendance(studentReg, subject, percentage);
    if(res.msg) showMessage(res.msg);
    attendanceForm.reset();
  });
}

// ----------------------
// Add Assignment
// ----------------------
if(assignmentForm) {
  assignmentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const studentReg = assignmentForm["studentReg"].value;
    const fileInput = assignmentForm["file"];
    if(fileInput.files.length === 0) {
      showMessage("Please select a file", "error");
      return;
    }

    const file = fileInput.files[0];
    if(file.size > 3 * 1024 * 1024) { // 3 MB
      showMessage("File size exceeds 3 MB", "error");
      return;
    }

    const res = await addAssignment(studentReg, file);
    if(res.msg) showMessage(res.msg);
    assignmentForm.reset();
  });
}

// ----------------------
// Message Admin
// ----------------------
if(messageForm) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = messageForm["message"].value;
    const res = await sendMessageToAdmin(message);
    if(res.msg) showMessage(res.msg);
    messageForm.reset();
  });
}
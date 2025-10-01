// admin.js

// ----------------------
// Helper function for API calls
// ----------------------
async function postData(url = "", data = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return response.json();
}

// ----------------------
// Admin Login
// ----------------------
const adminLoginForm = document.getElementById("adminLoginForm");
if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("adminUsername").value;
    const password = document.getElementById("adminPassword").value;
    const res = await postData("/admin/login", { username, password });
    alert(res.msg);
    if (!res.msg.includes("❌")) window.location.href = "admin.html";
  });
}

// ----------------------
// Add Student
// ----------------------
const addStudentForm = document.getElementById("addStudentForm");
if (addStudentForm) {
  addStudentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const regno = document.getElementById("studentRegno").value;
    const name = document.getElementById("studentName").value;
    const res = await postData("/admin/add-user", { username: "admin", password: "adminpassword", regno, name });
    alert(res.msg);
  });
}

// ----------------------
// Remove Student
// ----------------------
const removeStudentForm = document.getElementById("removeStudentForm");
if (removeStudentForm) {
  removeStudentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const regno = document.getElementById("removeStudentRegno").value;
    const res = await postData("/admin/remove-user", { username: "admin", password: "adminpassword", regno });
    alert(res.msg);
  });
}

// ----------------------
// Add Faculty
// ----------------------
const addFacultyForm = document.getElementById("addFacultyForm");
if (addFacultyForm) {
  addFacultyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("facultyUsername").value;
    const password = document.getElementById("facultyPassword").value;
    const name = document.getElementById("facultyName").value;
    const department = document.getElementById("facultyDept").value;
    const res = await postData("/admin/add-faculty", { username: "admin", password: "adminpassword", username, password, name, department });
    alert(res.msg);
  });
}

// ----------------------
// Remove Faculty
// ----------------------
const removeFacultyForm = document.getElementById("removeFacultyForm");
if (removeFacultyForm) {
  removeFacultyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("removeFacultyUsername").value;
    const res = await postData("/admin/remove-faculty", { username: "admin", password: "adminpassword", username });
    alert(res.msg);
  });
}

// ----------------------
// Add Notice
// ----------------------
const addNoticeForm = document.getElementById("addNoticeForm");
if (addNoticeForm) {
  addNoticeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const notice = document.getElementById("noticeText").value;
    const res = await postData("/admin/add-notice", { username: "admin", password: "adminpassword", notice });
    alert(res.msg);
  });
}

// ----------------------
// Add Exam
// ----------------------
const addExamForm = document.getElementById("addExamForm");
if (addExamForm) {
  addExamForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("examName").value;
    const date = document.getElementById("examDate").value;
    const res = await postData("/admin/add-exam", { username: "admin", password: "adminpassword", name, date });
    alert(res.msg);
  });
}

// ----------------------
// Assign Badge
// ----------------------
const assignBadgeForm = document.getElementById("assignBadgeForm");
if (assignBadgeForm) {
  assignBadgeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("badgeUsername").value;
    const role = document.getElementById("badgeRole").value;
    const res = await postData("/admin/assign-badge", { username: "admin", password: "adminpassword", username, role });
    alert(res.msg);
  });
}

// ----------------------
// Fetch Logs (Optional)
// ----------------------
const fetchLogsBtn = document.getElementById("fetchLogsBtn");
if (fetchLogsBtn) {
  fetchLogsBtn.addEventListener("click", async () => {
    const res = await fetch("/admin/logs");
    const data = await res.json();
    console.log("Logs:", data);
    alert("Logs fetched! Check console.");
  });
}
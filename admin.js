// admin.js

document.addEventListener("DOMContentLoaded", () => {
    updateCounters();

    // Dark/Light mode toggle
    const toggleTheme = document.getElementById("toggleTheme");
    toggleTheme.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        toggleTheme.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
    });

    // Add Student
    const studentForm = document.getElementById("studentForm");
    studentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const regno = document.getElementById("studentReg").value;
        const name = document.getElementById("studentName").value;
        try {
            const res = await fetch("/admin/add-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: "admin", password: prompt("Enter admin password"), regno, name })
            });
            const data = await res.json();
            showAlert(data.msg, res.ok);
            updateCounters();
        } catch (err) { console.error(err); }
        studentForm.reset();
    });

    // Remove Student
    const removeStudentForm = document.getElementById("removeStudentForm");
    removeStudentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const regno = document.getElementById("removeStudentReg").value;
        try {
            const res = await fetch("/admin/remove-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: "admin", password: prompt("Enter admin password"), regno })
            });
            const data = await res.json();
            showAlert(data.msg, res.ok);
            updateCounters();
        } catch (err) { console.error(err); }
        removeStudentForm.reset();
    });

    // Add Faculty
    const facultyForm = document.getElementById("facultyForm");
    facultyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("facultyUsername").value;
        const password = document.getElementById("facultyPassword").value;
        const name = document.getElementById("facultyName").value;
        const department = document.getElementById("facultyDept").value;
        try {
            const res = await fetch("/admin/add-faculty", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: "admin", password: prompt("Enter admin password"), facultyUsername: username, password, name, department })
            });
            const data = await res.json();
            showAlert(data.msg, res.ok);
            updateCounters();
        } catch (err) { console.error(err); }
        facultyForm.reset();
    });

    // Remove Faculty
    const removeFacultyForm = document.getElementById("removeFacultyForm");
    removeFacultyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("removeFacultyUsername").value;
        try {
            const res = await fetch("/admin/remove-faculty", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: "admin", password: prompt("Enter admin password"), username })
            });
            const data = await res.json();
            showAlert(data.msg, res.ok);
            updateCounters();
        } catch (err) { console.error(err); }
        removeFacultyForm.reset();
    });

    // Add Notice
    const noticeForm = document.getElementById("noticeForm");
    noticeForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const notice = document.getElementById("noticeText").value;
        try {
            const res = await fetch("/admin/add-notice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: "admin", password: prompt("Enter admin password"), notice })
            });
            const data = await res.json();
            showAlert(data.msg, res.ok);
            updateCounters();
        } catch (err) { console.error(err); }
        noticeForm.reset();
    });

    // Add Exam
    const examForm = document.getElementById("examForm");
    examForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("examName").value;
        const date = document.getElementById("examDate").value;
        try {
            const res = await fetch("/admin/add-exam", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: "admin", password: prompt("Enter admin password"), name, date })
            });
            const data = await res.json();
            showAlert(data.msg, res.ok);
            updateCounters();
        } catch (err) { console.error(err); }
        examForm.reset();
    });

    // Assign Badge
    const badgeForm = document.getElementById("badgeForm");
    badgeForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("badgeUsername").value;
        const role = document.getElementById("badgeRole").value;
        try {
            const res = await fetch("/admin/assign-badge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: "admin", password: prompt("Enter admin password"), username, role })
            });
            const data = await res.json();
            showAlert(data.msg, res.ok);
        } catch (err) { console.error(err); }
        badgeForm.reset();
    });
});

// Function to update dashboard counters
async function updateCounters() {
    try {
        const resStudents = await fetch("/student/all"); // Endpoint to get all students
        const students = await resStudents.json();
        document.getElementById("totalStudents").textContent = students.length;

        const resFaculty = await fetch("/faculty/all"); // Endpoint to get all faculty
        const faculty = await resFaculty.json();
        document.getElementById("totalFaculty").textContent = faculty.length;

        const resNotices = await fetch("/student/notices"); // Endpoint to get all notices
        const notices = await resNotices.json();
        document.getElementById("totalNotices").textContent = notices.length;

        const resExams = await fetch("/student/exams"); // Endpoint to get all exams
        const exams = await resExams.json();
        document.getElementById("totalExams").textContent = exams.length;

    } catch (err) { console.error(err); }
}

// Function to show alert messages
function showAlert(msg, success=true) {
    const alertContainer = document.getElementById("alertContainer");
    const div = document.createElement("div");
    div.className = success ? "alert success" : "alert error";
    div.textContent = msg;
    alertContainer.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}
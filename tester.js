// tester.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("testForm");
  const results = document.getElementById("testResults");

  const resultName = document.getElementById("resultName");
  const resultType = document.getElementById("resultType");
  const resultNotes = document.getElementById("resultNotes");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Get form values
    const testName = document.getElementById("testName").value;
    const testType = document.getElementById("testType").value;
    const testNotes = document.getElementById("testNotes").value;

    // Populate results
    resultName.textContent = testName;
    resultType.textContent = testType;
    resultNotes.textContent = testNotes || "No additional notes provided.";

    // Show results section
    results.style.display = "block";

    // Clear form after submission
    form.reset();

    // Fancy effect: highlight result box
    results.classList.add("highlight");
    setTimeout(() => results.classList.remove("highlight"), 1500);
  });
});
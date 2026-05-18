// admin/js/add-question.js — Add Question form logic
const API = "http://127.0.0.1:5000/api";

// Auth guard
if (!sessionStorage.getItem("adminUser")) {
  window.location.href = "login.html";
}

const adminUser = sessionStorage.getItem("adminUser");
document.getElementById("admin-avatar").textContent = adminUser[0].toUpperCase();

async function addQuestion() {
  const question = document.getElementById("q-text").value.trim();
  const optA = document.getElementById("opt-a").value.trim();
  const optB = document.getElementById("opt-b").value.trim();
  const optC = document.getElementById("opt-c").value.trim();
  const optD = document.getElementById("opt-d").value.trim();
  const correct = document.getElementById("q-correct").value;

  const errorEl = document.getElementById("error-msg");
  const successEl = document.getElementById("success-msg");
  const errorText = document.getElementById("error-text");

  // Hide previous messages
  errorEl.classList.add("hidden");
  successEl.classList.add("hidden");

  // Validate
  if (!question || !optA || !optB || !optC || !optD) {
    errorText.textContent = "Please fill in the question and all four options.";
    errorEl.classList.remove("hidden");
    return;
  }
  if (correct === "") {
    errorText.textContent = "Please select the correct answer.";
    errorEl.classList.remove("hidden");
    return;
  }

  // Loading state
  document.getElementById("add-btn-text").classList.add("hidden");
  document.getElementById("add-btn-loader").classList.remove("hidden");
  document.getElementById("add-btn").disabled = true;

  try {
    const res = await fetch(`${API}/add-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        options: [optA, optB, optC, optD],
        correct: parseInt(correct)
      })
    });
    const data = await res.json();

    if (data.success) {
      successEl.classList.remove("hidden");
      showToast("Question added successfully!", "success");
      clearForm();
    } else {
      errorText.textContent = data.error || "Failed to add question.";
      errorEl.classList.remove("hidden");
    }
  } catch (err) {
    errorText.textContent = "Cannot reach server. Is the backend running on port 5000?";
    errorEl.classList.remove("hidden");
  } finally {
    document.getElementById("add-btn-text").classList.remove("hidden");
    document.getElementById("add-btn-loader").classList.add("hidden");
    document.getElementById("add-btn").disabled = false;
  }
}

function clearForm() {
  document.getElementById("q-text").value = "";
  document.getElementById("opt-a").value = "";
  document.getElementById("opt-b").value = "";
  document.getElementById("opt-c").value = "";
  document.getElementById("opt-d").value = "";
  document.getElementById("q-correct").value = "";
  document.getElementById("error-msg").classList.add("hidden");
  document.getElementById("success-msg").classList.add("hidden");
}

function showToast(msg, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas fa-${type === "success" ? "check-circle" : "exclamation-circle"}"></i><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

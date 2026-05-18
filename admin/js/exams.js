// admin/js/exams.js — Question Bank management
const API = "http://127.0.0.1:5000/api";

// Auth guard
if (!sessionStorage.getItem("adminUser")) {
  window.location.href = "login.html";
}

document.getElementById("admin-avatar").textContent =
  sessionStorage.getItem("adminUser")[0].toUpperCase();

let allQuestions = [];

async function loadQuestions() {
  const list = document.getElementById("questions-list");
  list.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted)">
    <i class="fas fa-circle-notch fa-spin" style="font-size:1.5rem;margin-bottom:0.5rem;display:block"></i>
    Loading questions...
  </div>`;

  try {
    const res = await fetch(`${API}/get-questions?admin=true`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    allQuestions = data.questions;
    document.getElementById("q-count-label").textContent =
      `${allQuestions.length} question${allQuestions.length !== 1 ? "s" : ""} in question bank`;

    renderQuestions(allQuestions);
  } catch (err) {
    list.innerHTML = `<div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <p>Failed to load questions. Is the backend running?</p>
    </div>`;
    console.error(err);
  }
}

function renderQuestions(questions) {
  const list = document.getElementById("questions-list");

  if (!questions.length) {
    list.innerHTML = `<div class="empty-state">
      <i class="fas fa-circle-question"></i>
      <p>No questions found. <a href="add-question.html" style="color:var(--primary)">Add the first one →</a></p>
    </div>`;
    return;
  }

  const optionLabels = ["A", "B", "C", "D"];

  list.innerHTML = questions.map((q, i) => `
    <div class="question-list-item" id="q-item-${q.id}" style="animation-delay:${i * 0.05}s">
      <div class="q-item-content">
        <div class="q-item-text">
          <span style="color:var(--text-dim);font-size:0.8rem;margin-right:0.4rem">#${i + 1}</span>
          ${escHtml(q.question)}
        </div>
        <div class="q-item-options">
          ${q.options.map((opt, idx) => `
            <span class="q-option-tag ${idx === q.correct ? "correct-tag" : ""}">
              <strong>${optionLabels[idx]}.</strong> ${escHtml(opt)}
              ${idx === q.correct ? ' <i class="fas fa-check" style="font-size:0.65rem"></i>' : ""}
            </span>
          `).join("")}
        </div>
      </div>
      <button class="btn-danger" onclick="deleteQuestion('${q.id}', this)" title="Delete question">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  `).join("");
}

async function deleteQuestion(id, btn) {
  if (!confirm("Are you sure you want to delete this question? This cannot be undone.")) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';

  try {
    const res = await fetch(`${API}/delete-question/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (data.success) {
      // Remove from DOM with animation
      const item = document.getElementById(`q-item-${id}`);
      if (item) {
        item.style.transition = "opacity 0.3s, transform 0.3s";
        item.style.opacity = "0";
        item.style.transform = "translateX(20px)";
        setTimeout(() => {
          item.remove();
          allQuestions = allQuestions.filter(q => q.id !== id);
          document.getElementById("q-count-label").textContent =
            `${allQuestions.length} question${allQuestions.length !== 1 ? "s" : ""} in question bank`;
        }, 300);
      }
      showToast("Question deleted", "success");
    } else {
      showToast(data.error || "Delete failed", "error");
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-trash-alt"></i>';
    }
  } catch (err) {
    showToast("Server error. Try again.", "error");
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-trash-alt"></i>';
  }
}

function filterQuestions(query) {
  const q = query.toLowerCase();
  const filtered = allQuestions.filter(item =>
    item.question.toLowerCase().includes(q) ||
    item.options.some(opt => opt.toLowerCase().includes(q))
  );
  renderQuestions(filtered);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function showToast(msg, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas fa-${type === "success" ? "check-circle" : "exclamation-circle"}"></i><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Init
loadQuestions();

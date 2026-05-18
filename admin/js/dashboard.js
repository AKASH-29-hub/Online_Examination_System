// admin/js/dashboard.js — Dashboard logic with charts
const API = "http://127.0.0.1:5000/api";

// Auth guard
if (!sessionStorage.getItem("adminUser")) {
  window.location.href = "login.html";
}

const adminUser = sessionStorage.getItem("adminUser");
document.getElementById("admin-avatar").textContent = adminUser[0].toUpperCase();

let scoreChartInstance = null;
let warnChartInstance = null;

// Chart.js global defaults (dark theme)
Chart.defaults.color = "#7382ac";
Chart.defaults.borderColor = "rgba(99,120,255,0.1)";

async function loadAll() {
  await Promise.all([loadStats(), loadResults(), loadLogs(), loadQuestionCount()]);
}

// ─── Stats ────────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch(`${API}/get-results`);
    const data = await res.json();
    if (!data.success) return;

    const s = data.stats;
    animateCount("stat-total-exams", s.totalExams);
    document.getElementById("stat-avg-score").textContent = s.avgScore + "%";
    animateCount("stat-total-warnings", s.totalWarnings);
  } catch (e) {
    console.error("Stats load error:", e);
  }
}

async function loadQuestionCount() {
  try {
    const res = await fetch(`${API}/get-questions?admin=true`);
    const data = await res.json();
    if (data.success) {
      animateCount("stat-total-questions", data.questions.length);
    }
  } catch (e) { console.error(e); }
}

// ─── Results ─────────────────────────────────────────────────────────────────
async function loadResults() {
  try {
    const res = await fetch(`${API}/get-results`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const tbody = document.getElementById("results-tbody");
    const results = data.results;

    document.getElementById("results-count").textContent = `${results.length} records`;

    if (!results.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-inbox"></i><p>No results yet</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = results.map((r, i) => `
      <tr>
        <td style="color:var(--text-muted)">${i + 1}</td>
        <td><strong>${escHtml(r.name)}</strong></td>
        <td>${r.score} / ${r.total}</td>
        <td>
          <span class="badge ${pctBadge(r.percentage)}">${r.percentage}%</span>
        </td>
        <td>
          <span class="badge ${r.warnings > 0 ? "badge-warning" : "badge-success"}">${r.warnings}</span>
        </td>
        <td>${getGrade(r.percentage)}</td>
        <td style="color:var(--text-muted);font-size:0.8rem">${r.timestamp}</td>
      </tr>
    `).join("");

    // Build score distribution chart
    buildScoreChart(results);
    buildWarnChart(results);

    // Update logs count
    const logsRes = await fetch(`${API}/get-logs`);
    const logsData = await logsRes.json();
    if (logsData.success) {
      animateCount("stat-total-logs", logsData.logs.length);
    }
  } catch (e) {
    console.error("Results error:", e);
    showToast("Failed to load results", "error");
  }
}

// ─── Logs ─────────────────────────────────────────────────────────────────────
async function loadLogs() {
  try {
    const res = await fetch(`${API}/get-logs`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const tbody = document.getElementById("logs-tbody");
    const logs = data.logs;

    document.getElementById("logs-count").textContent = `${logs.length} events`;

    if (!logs.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-shield-check"></i><p>No security events recorded</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map((l, i) => `
      <tr>
        <td style="color:var(--text-muted)">${i + 1}</td>
        <td><strong>${escHtml(l.name)}</strong></td>
        <td>
          <span class="badge ${logBadge(l.action)}">${escHtml(l.action)}</span>
        </td>
        <td style="color:var(--text-muted);font-size:0.8rem">${escHtml(l.time)}</td>
        <td style="color:var(--text-dim);font-size:0.78rem">${l.timestamp}</td>
      </tr>
    `).join("");
  } catch (e) {
    console.error("Logs error:", e);
    showToast("Failed to load logs", "error");
  }
}

// ─── Charts ───────────────────────────────────────────────────────────────────
function buildScoreChart(results) {
  const bins = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
  results.forEach(r => {
    const p = r.percentage;
    if (p <= 20) bins["0-20"]++;
    else if (p <= 40) bins["21-40"]++;
    else if (p <= 60) bins["41-60"]++;
    else if (p <= 80) bins["61-80"]++;
    else bins["81-100"]++;
  });

  if (scoreChartInstance) scoreChartInstance.destroy();
  const ctx = document.getElementById("scoreChart").getContext("2d");
  scoreChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(bins),
      datasets: [{
        label: "Students",
        data: Object.values(bins),
        backgroundColor: [
          "rgba(248,113,113,0.6)", "rgba(251,191,36,0.6)",
          "rgba(163,230,53,0.6)", "rgba(74,222,128,0.6)", "rgba(34,211,238,0.6)"
        ],
        borderColor: [
          "rgb(248,113,113)", "rgb(251,191,36)",
          "rgb(163,230,53)", "rgb(74,222,128)", "rgb(34,211,238)"
        ],
        borderWidth: 1, borderRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "rgba(99,120,255,0.08)" } },
        x: { grid: { display: false } }
      }
    }
  });
}

function buildWarnChart(results) {
  let w0 = 0, w1 = 0, w2 = 0, w3p = 0;
  results.forEach(r => {
    if (r.warnings === 0) w0++;
    else if (r.warnings === 1) w1++;
    else if (r.warnings === 2) w2++;
    else w3p++;
  });

  if (warnChartInstance) warnChartInstance.destroy();
  const ctx = document.getElementById("warnChart").getContext("2d");
  warnChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["0 Warnings", "1 Warning", "2 Warnings", "3+ Warnings"],
      datasets: [{
        data: [w0, w1, w2, w3p],
        backgroundColor: ["rgba(74,222,128,0.7)", "rgba(251,191,36,0.7)", "rgba(248,113,113,0.5)", "rgba(248,113,113,0.85)"],
        borderColor: ["rgb(74,222,128)", "rgb(251,191,36)", "rgb(248,113,113)", "rgb(239,68,68)"],
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, padding: 12, font: { size: 11 } } }
      },
      cutout: "65%"
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGrade(pct) {
  if (pct >= 90) return '<span class="badge badge-blue">Outstanding</span>';
  if (pct >= 75) return '<span class="badge badge-success">Excellent</span>';
  if (pct >= 60) return '<span class="badge badge-success">Good</span>';
  if (pct >= 40) return '<span class="badge badge-warning">Average</span>';
  return '<span class="badge badge-danger">Poor</span>';
}

function pctBadge(pct) {
  if (pct >= 75) return "badge-success";
  if (pct >= 50) return "badge-warning";
  return "badge-danger";
}

function logBadge(action) {
  if (action.toLowerCase().includes("warning")) return "badge-danger";
  if (action.toLowerCase().includes("tab") || action.toLowerCase().includes("fullscreen")) return "badge-warning";
  if (action.toLowerCase().includes("submit")) return "badge-success";
  return "badge-blue";
}

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 30);
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(interval);
  }, 40);
}

function showToast(msg, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas fa-${type === "success" ? "check-circle" : "exclamation-circle"}"></i><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function logout() {
  sessionStorage.removeItem("adminUser");
}

// Init
loadAll();

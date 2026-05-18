// script.js — Online Exam System Core Logic
// Anti-cheating + exam flow + API communication
// ─────────────────────────────────────────────────────────────────────────────
// FIXES APPLIED (see inline comments):
//   Bug 1 — Script load order (fixed in exam.html)
//   Bug 2 — Scoped variable ReferenceError in startWebcam()
//   Bug 3 — Premature detection before video has real dimensions
//   Bug 4 — warningVisible flag races with fast re-detection
//   Bug 5 — No startup grace period; camera fires warning on first tick
//   Bug 6 — Model path '/models' breaks on file:// and non-root servers
// ─────────────────────────────────────────────────────────────────────────────

const API = "http://127.0.0.1:5000/api";

// ─── State ────────────────────────────────────────────────────────────────────
let questions        = [];
let answers          = {};
let currentIndex     = 0;
let warnings         = 0;
const MAX_WARNINGS   = 3;
let timerInterval    = null;
let timeLeft         = 30 * 60; // 30 minutes in seconds
let examSubmitted    = false;
let noFaceStartTime = null;
let lastFaceState = null;
 // number of continuous detections before warning

// ── Warning gate ──────────────────────────────────────────────────────────────
// warningVisible    → true while the modal is open; prevents stacking modals.
// faceCooldownUntil → timestamp (ms) before which face-detection warnings are
//                     suppressed. Set on each face-warning dismiss so the student
//                     has time to re-position without being immediately re-warned.
let warningVisible    = false;
let faceCooldownUntil = 0;

// Face-detection startup grace period (ms). Camera needs time to warm up;
// without this the very first detection tick fires a "No face" warning.
const FACE_GRACE_MS  = 8000;   // FIX Bug 5: 5-second startup grace
const FACE_COOLDOWN_MS = 8000; // FIX Bug 4: 8-second cooldown after dismissal
const FACE_INTERVAL_MS = 3000; // How often to run detection

let studentName = sessionStorage.getItem("studentName") || "Student";
let studentId   = sessionStorage.getItem("studentId")   || "---";

// ─── Face API — model loading ─────────────────────────────────────────────────
// FIX Bug 6: Use a pinned jsDelivr CDN URI instead of '/models' (which breaks
// on file:// URLs and any server where the /models folder isn't at root).
const FACE_MODEL_URI = "./models";

async function loadFaceModels() {
  try {
    // Only TinyFaceDetector weights are needed — smallest download (~190 KB).
    await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URI);
    await faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URI);
    console.log("[FaceAPI] ✅ TinyFaceDetector model loaded");
    updateFaceStatus("ok", "Model ready");
    return true;
  } catch (err) {
    console.error("[FaceAPI] ❌ Model load failed:", err);
    updateFaceStatus("warn", "Model failed");
    return false;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Guard: must be logged in
  if (!sessionStorage.getItem("studentName")) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("student-display").innerHTML =
    `<i class="fas fa-user"></i> ${studentName} (${studentId})`;

  // Load questions, timer, anti-cheat in parallel — don't block on face models
  await loadQuestions();
  startTimer();
  enableAntiCheat();
  requestFullscreen();

  // Webcam + face detection run independently (don't await — non-blocking)
  startWebcam();
});

// ─── Questions ────────────────────────────────────────────────────────────────
async function loadQuestions() {
  try {
    const res  = await fetch(`${API}/get-questions`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    questions = shuffleArray(data.questions);
    renderQuestion();
    renderPalette();
    updateStats();
  } catch (err) {
    document.getElementById("q-text").textContent =
      "⚠️ Could not load questions. Ensure the backend server is running.";
    console.error("[Exam] Load questions error:", err);
  }
}

function renderQuestion() {
  if (!questions.length) return;

  const q     = questions[currentIndex];
  const total = questions.length;

  document.getElementById("q-number").textContent =
    `Question ${currentIndex + 1} of ${total}`;
  document.getElementById("q-text").textContent = q.question;

  const isAnswered = answers[currentIndex] !== undefined;
  const badge      = document.getElementById("q-status-badge");
  badge.textContent = isAnswered ? "Answered" : "Unanswered";
  badge.className   = `q-status-badge ${isAnswered ? "answered" : ""}`;

  const grid = document.getElementById("options-grid");
  grid.innerHTML = "";
  q.options.forEach((opt, i) => {
    const btn       = document.createElement("button");
    btn.className   = "option-btn";
    if (answers[currentIndex] === i) btn.classList.add("selected");
    btn.innerHTML   = `
      <span class="option-letter">${String.fromCharCode(65 + i)}</span>
      <span class="option-text">${opt}</span>
    `;
    btn.addEventListener("click", () => selectAnswer(i));
    grid.appendChild(btn);
  });

  document.getElementById("prev-btn").disabled = currentIndex === 0;
  document.getElementById("next-btn").disabled = currentIndex === total - 1;

  const answered = Object.keys(answers).length;
  const pct      = Math.round((answered / total) * 100);
  document.getElementById("progress-fill").style.width = pct + "%";
  document.getElementById("progress-label").textContent = `${pct}% Complete`;

  document.querySelectorAll(".palette-btn").forEach((b, i) => {
    b.classList.toggle("current",  i === currentIndex);
    b.classList.toggle("answered", answers[i] !== undefined);
  });
}

function selectAnswer(optionIndex) {
  if (examSubmitted) return;
  answers[currentIndex] = optionIndex;
  renderQuestion();
  updateStats();
}

function navigateQuestion(dir) {
  const next = currentIndex + dir;
  if (next >= 0 && next < questions.length) {
    currentIndex = next;
    renderQuestion();
  }
}

function renderPalette() {
  const palette  = document.getElementById("question-palette");
  palette.innerHTML = "";
  questions.forEach((_, i) => {
    const btn       = document.createElement("button");
    btn.className   = "palette-btn";
    btn.textContent = i + 1;
    if (i === 0) btn.classList.add("current");
    btn.addEventListener("click", () => { currentIndex = i; renderQuestion(); });
    palette.appendChild(btn);
  });
}

function updateStats() {
  const answered = Object.keys(answers).length;
  const total    = questions.length;
  document.getElementById("stat-answered").textContent  = answered;
  document.getElementById("stat-remaining").textContent = total - answered;
  document.getElementById("stat-total").textContent     = total;
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      logActivity("Timer expired — auto-submitted");
      submitExam(true);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const mins    = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const secs    = (timeLeft % 60).toString().padStart(2, "0");
  const display = document.getElementById("timer-display");
  document.getElementById("timer-text").textContent = `${mins}:${secs}`;
  if (timeLeft < 300) display.classList.add("timer-urgent");
  if (timeLeft < 60)  display.classList.add("timer-critical");
}

// ─── Submit ───────────────────────────────────────────────────────────────────
function confirmSubmit() {
  if (examSubmitted) return;
  const unanswered = questions.length - Object.keys(answers).length;
  const msg = unanswered > 0
    ? `You have ${unanswered} unanswered question(s). Are you sure you want to submit?`
    : "Are you sure you want to submit your exam?";
  if (confirm(msg)) submitExam(false);
}

async function submitExam(auto = false) {
  if (examSubmitted) return;
  examSubmitted = true;
  clearInterval(timerInterval);

  let score = 0;
  questions.forEach((q, i) => {
    if (answers[i] !== undefined && Number(answers[i]) === Number(q.correct)) {
      score++;
    }
  });

  const total = questions.length;

  try {
    await fetch(`${API}/submit-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: studentName, score, total, warnings, auto_submitted: auto })
    });
  } catch (err) {
    console.error("[Exam] Failed to save result:", err);
  }

  await logActivity(auto ? "Auto-submitted (time/warnings)" : "Manual submission");

  sessionStorage.setItem("examScore",    score);
  sessionStorage.setItem("examTotal",    total);
  sessionStorage.setItem("examWarnings", warnings);

  window.location.href = "result.html";
}

// ─── Warning Modal ────────────────────────────────────────────────────────────
/**
 * triggerWarning(message, isFaceWarning)
 *
 * FIX Bug 4: Added `isFaceWarning` parameter. When true, sets a cooldown
 * timestamp so that rapid re-detection after dismissal cannot immediately
 * re-open the modal. The student gets FACE_COOLDOWN_MS to fix their position.
 */
function triggerWarning(message, isFaceWarning = false) {
  // Don't stack modals or trigger while exam is over
  if (Date.now() < faceCooldownUntil) return; // FIX Bug 4: Suppress if in cooldown
  if (examSubmitted || warningVisible) return;

  warnings++;
  warningVisible = true;

  // Update header badge
  document.getElementById("warn-count").textContent = warnings;
  const warningsDisplay = document.getElementById("warnings-display");
  warningsDisplay.classList.add("warning-active");
  setTimeout(() => warningsDisplay.classList.remove("warning-active"), 2000);

  // Populate and show modal
  document.getElementById("warning-msg").textContent  = message;
  document.getElementById("w-current").textContent    = warnings;
  document.getElementById("warning-overlay").classList.remove("hidden");

  console.warn(`[AntiCheat] Warning ${warnings}/${MAX_WARNINGS}: ${message}`);
  logActivity(`Warning ${warnings}: ${message}`);

  // Auto-submit on hitting the limit
  if (warnings >= MAX_WARNINGS) {
    // Give the student 2 s to read the modal before forcing submission
    setTimeout(() => {
      if (!examSubmitted) {
        alert("Maximum warnings reached. Your exam is being submitted automatically.");
        submitExam(true);
      }
    }, 2000);
  }
}

/**
 * dismissWarning()
 * Called by the "I Understand" button in the modal.
 * Sets the face-detection cooldown so detection doesn't re-fire instantly.
 */
function dismissWarning() {
  document.getElementById("warning-overlay").classList.add("hidden");
  warningVisible    = false;

  // FIX Bug 4: Give student time to re-position before next face check
  faceCooldownUntil = Date.now() + FACE_COOLDOWN_MS;
}

// ─── Fullscreen ───────────────────────────────────────────────────────────────
function requestFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn("[Fullscreen] Not available:", err.message);
    });
  }
}

// ─── Anti-Cheat Event Listeners ───────────────────────────────────────────────
function enableAntiCheat() {
  // Tab visibility
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !examSubmitted) {
      triggerWarning("Tab switching detected!");
      logActivity("Tab switch detected");
    }
  });

  // Fullscreen exit
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && !examSubmitted) {
      triggerWarning("Fullscreen mode exited!");
      logActivity("Fullscreen exit detected");
      setTimeout(requestFullscreen, 1000);
    }
  });

  // Right-click
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    logActivity("Right-click attempt");
  });

  // Blocked keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (examSubmitted) return;
    const blocked =
      e.key === "F12" ||
      (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
      (e.ctrlKey && ["u", "s", "a"].includes(e.key.toLowerCase())) ||
      e.key === "PrintScreen";

    if (blocked) {
      e.preventDefault();
      logActivity(`Blocked key: ${e.key}`);
    }
    if (e.altKey && e.key === "Tab") e.preventDefault();
  });

  // Window blur
  window.addEventListener("blur", () => {
    if (!examSubmitted) logActivity("Window focus lost");
  });

  // Clipboard
  ["copy", "paste", "cut"].forEach(evt => {
    document.addEventListener(evt, (e) => {
      e.preventDefault();
      logActivity(`${evt.charAt(0).toUpperCase() + evt.slice(1)} attempt`);
    });
  });
}

// ─── Webcam + Face Detection ──────────────────────────────────────────────────
/**
 * startWebcam()
 *
 * FIX Bug 2: `video` is now declared at the top of the function and accessible
 *            throughout — the original code declared it inside `try` but then
 *            referenced it in a listener OUTSIDE the try block, causing a
 *            ReferenceError that silently killed the entire pipeline.
 *
 * FIX Bug 3: Detection now starts on "loadedmetadata" (video dimensions are
 *            guaranteed to be non-zero) instead of "play" (where width/height
 *            can still be 0, making face-api throw internally).
 */
async function startWebcam() {
  // Grab the element ONCE at top-level scope — no scoping issues
  const video = document.getElementById("webcam");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
      audio: false
    });
    video.srcObject = stream;

    // FIX Bug 3: "loadedmetadata" fires when width/height are ready.
    // Also load face models in parallel while the camera warms up.
    video.addEventListener("loadedmetadata", async () => {
      console.log(
        `[Webcam] Stream ready — ${video.videoWidth}x${video.videoHeight}`
      );
      updateFaceStatus("ok", "Camera on");

      // Load models (if not already done) before starting detection
      const modelsReady = await loadFaceModels();
      if (modelsReady) {
        // FIX Bug 5: Delay first detection tick by FACE_GRACE_MS so the camera
        // exposure/autofocus can stabilise and avoid a false "No face" warning.
        console.log(`[FaceAPI] Grace period: ${FACE_GRACE_MS / 1000}s before detection starts`);
        updateFaceStatus("warn", `Starting in ${FACE_GRACE_MS / 1000}s…`);
        setTimeout(() => {
          updateFaceStatus("ok", "Detecting…");
          detectFaces(video);
        }, FACE_GRACE_MS);
      }
    }, { once: true }); // `once: true` — listener auto-removes after first fire

  } catch (err) {
    console.warn("[Webcam] Access denied or unavailable:", err.message);
    document.getElementById("webcam-container").style.display = "none";
    logActivity("Webcam access denied by student");
  }
}

/**
 * detectFaces(video)
 *
 * FIX Bug 3: Validates videoWidth > 0 each tick before calling face-api.
 *            If dimensions are somehow still zero, silently skips that tick.
 *
 * FIX Bug 4: Checks faceCooldownUntil so a recent dismissal suppresses the
 *            next N seconds of detections, preventing instant re-triggering.
 *
 * FIX Bug 5: Grace period is handled by the caller (setTimeout in startWebcam).
 */
async function detectFaces(video) {
  // TinyFaceDetector is the lightest model — fast enough for 2-second intervals.
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 224,       // Must be a multiple of 32; 224 is fast & accurate enough
    scoreThreshold: 0.3   // Minimum confidence to count as a real face
  });

  const intervalId = setInterval(async () => {
    // Stop the interval cleanly when exam is over
    if (examSubmitted) {
      clearInterval(intervalId);
      return;
    }

    // FIX Bug 3: Skip tick if video hasn't rendered a real frame yet
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
      console.warn("[FaceAPI] Video not ready, skipping tick");
      return;
    }

    // FIX Bug 4: Skip tick during post-dismissal cooldown
    if (Date.now() < faceCooldownUntil) return;

    // A modal is already open — don't stack a new one
    if (warningVisible) return;

    try {
      const detections = await faceapi.detectAllFaces(video, options);
      const count      = detections.length;

      console.log(`[FaceAPI] Faces detected: ${count}`);

      if (count === 0) {
        // ── NO FACE DETECTED ──────────────────────────────────────────────────
        updateFaceStatus("warn", "Checking face...");
        if (!noFaceStartTime) {
          noFaceStartTime = Date.now();
        }
        // Only trigger a warning if the face has been missing for more than 4 seconds,
        if (Date.now() - noFaceStartTime > 4000) {
          updateFaceStatus("danger", "No face!");
          triggerWarning("No face detected! Please ensure your face is fully visible in the webcam preview.", true);
          
          sendFaceEvent("NO_FACE");

          noFaceStartTime = null; // reset timer for next time
        }

      } else if (count > 1) {
        // ── MULTIPLE FACES DETECTED ───────────────────────────────────────────
        updateFaceStatus("danger", `${count} faces!`);
        triggerWarning(`Multiple faces detected (${count})! Only you should be visible.`, true);
        logActivity(`Multiple faces detected: ${count}`);

        if (window.lastFaceState !== "MULTI") {
          sendFaceEvent("MULTIPLE_FACES");
          window.lastFaceState = "MULTI";
      }

      } else {
        noFaceStartTime = null; 
        // reset no-face timer
        // ── EXACTLY ONE FACE — all good ───────────────────────────────────────
        updateFaceStatus("ok", "Face OK ✓");

          // ✅ IMPORTANT: only send once (prevent spam)
        if (!window.lastFaceState || window.lastFaceState !== "OK") {
          sendFaceEvent("SINGLE_FACE");
          window.lastFaceState = "OK";
        
        }
      } 

    } catch (err) {
      // Swallow detection errors (e.g. tab hidden, canvas not ready)
      // so the interval keeps running cleanly
      console.warn("[FaceAPI] Detection tick error:", err.message);
    }

  }, FACE_INTERVAL_MS);
}

// ─── Face Status Indicator (webcam overlay) ───────────────────────────────────
/**
 * updateFaceStatus(state, text)
 * state: "ok" | "warn" | "danger"
 * Updates the small overlay badge on the webcam preview.
 */
function updateFaceStatus(state, text) {
  const el = document.getElementById("face-status");
  if (!el) return;
  el.className = `face-status face-${state}`;
  document.getElementById("face-status-text").textContent = text;
}

// ─── Logging ──────────────────────────────────────────────────────────────────
async function logActivity(action) {
  try {
    await fetch(`${API}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: studentName,
        action,
        time: new Date().toLocaleTimeString()
      })
    });
  } catch (err) {
    // Non-fatal — log locally if server unreachable
    console.error("[Log] Server unreachable:", err.message);
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


async function sendFaceEvent(type) {
  try {
    const res = await fetch("http://127.0.0.1:5000/api/face-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        studentId: sessionStorage.getItem("studentId") || "test_user",
        event: type,
        time: new Date().toISOString()
      })
    });

    const data = await res.json();

    // Backend auto-submit
    if (data.action === "AUTO_SUBMIT") {
      alert("🚨 Cheating detected. Auto submitting.");
      submitExam(true);
    }

  } catch (err) {
    console.error("Face API error:", err);
  }
}



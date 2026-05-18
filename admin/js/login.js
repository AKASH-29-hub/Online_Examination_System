// admin/js/login.js — Admin authentication logic
const API = "http://127.0.0.1:5000/api";

async function adminLogin() {
  const username = document.getElementById("admin-user").value.trim();
  const password = document.getElementById("admin-pass").value.trim();
  const errorEl = document.getElementById("error-msg");
  const errorText = document.getElementById("error-text");

  if (!username || !password) {
    errorText.textContent = "Please enter both username and password.";
    errorEl.classList.remove("hidden");
    return;
  }

  // Show loader
  document.getElementById("btn-text").classList.add("hidden");
  document.getElementById("btn-loader").classList.remove("hidden");
  errorEl.classList.add("hidden");

  try {
    const res = await fetch(`${API}/admin-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.success) {
      sessionStorage.setItem("adminUser", data.admin);
      window.location.href = "dashboard.html";
    } else {
      errorText.textContent = data.error || "Invalid credentials.";
      errorEl.classList.remove("hidden");
    }
  } catch (err) {
    errorText.textContent = "Cannot reach server. Is the backend running?";
    errorEl.classList.remove("hidden");
  } finally {
    document.getElementById("btn-text").classList.remove("hidden");
    document.getElementById("btn-loader").classList.add("hidden");
  }
}

// Enter key support
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") adminLogin();
});

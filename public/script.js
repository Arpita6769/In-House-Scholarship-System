document.addEventListener("DOMContentLoaded", () => {

const API = "/api/auth";

function getToken() {
  return localStorage.getItem("token");
}

function formatCurrency(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN");
}

function formatDate(dateStr) {
  if (!dateStr) return "No deadline";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function daysLeft(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

// ── LOGOUT ────────────────────────────────────
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "login.html";
  });
}

// ── REGISTER ──────────────────────────────────
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      name: document.getElementById("name").value,
      email: document.getElementById("email").value,
      password: document.getElementById("password").value,
      roll_no: document.getElementById("roll_no").value,
      cgpa: document.getElementById("cgpa").value,
      family_income: document.getElementById("family_income").value,
    };
    const res = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    alert(data.message);
    if (res.ok) window.location.href = "login.html";
  });
}

// ── LOGIN ─────────────────────────────────────
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      email: document.getElementById("loginEmail").value,
      password: document.getElementById("loginPassword").value,
    };
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      window.location.href = data.role === "admin" ? "admin.html" : "student.html";
    } else {
      alert(data.message);
    }
  });
}

// ── STUDENT DASHBOARD ─────────────────────────
const scholarshipList = document.getElementById("scholarshipList");
if (scholarshipList) {
  const token = getToken();
  if (!token) window.location.href = "login.html";

  fetch(`${API}/scholarships`, {
    headers: { Authorization: "Bearer " + token },
  })
    .then((r) => r.json())
    .then((scholarships) => {
      if (!scholarships.length) {
        scholarshipList.innerHTML = `<p class="no-data">No scholarships available right now.</p>`;
        return;
      }
      scholarshipList.innerHTML = scholarships.map((s) => {
        const days = daysLeft(s.deadline);
        const deadlineHtml = days !== null
          ? days <= 7
            ? `<span class="deadline-warn">⏰ ${days} days left</span>`
            : `<span>${formatDate(s.deadline)}</span>`
          : "<span>—</span>";
        const seatsLeft = s.total_seats - (s.approved_seats || 0);
        return `
          <div class="scholarship-card">
            <div class="card-header">
              <h3 class="card-title">${s.title}</h3>
            </div>
            <p class="card-desc">${s.description || "No description provided."}</p>
            <div class="card-meta-grid">
              <div class="meta-item">
                <span class="meta-label">Amount</span>
                <span class="meta-value">${formatCurrency(s.amount)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Min. CGPA</span>
                <span class="meta-value">${s.min_cgpa || "—"}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Deadline</span>
                <span class="meta-value">${deadlineHtml}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Seats left</span>
                <span class="meta-value ${seatsLeft <= 3 ? 'warn' : ''}">${seatsLeft} of ${s.total_seats}</span>
              </div>
            </div>
            <div class="card-footer">
              <span class="seats-info">👥 ${seatsLeft} seats remaining</span>
              <a href="scholarship-detail.html?id=${s.id}" class="btn-detail">View details →</a>
            </div>
          </div>
        `;
      }).join("");
    })
    .catch(() => {
      scholarshipList.innerHTML = `<p class="error-text">Failed to load scholarships.</p>`;
    });

  fetch(`${API}/my-applications`, {
    headers: { Authorization: "Bearer " + token },
  })
    .then((r) => r.json())
    .then((apps) => {
      const myApplications = document.getElementById("myApplications");
      if (!apps.length) {
        myApplications.innerHTML = `<p class="no-data">You haven't applied to any scholarships yet.</p>`;
        return;
      }
      myApplications.innerHTML = apps.map((app) => {
        const statusClass =
          app.status === "Approved" ? "status-approved" :
          app.status === "Rejected" ? "status-rejected" : "status-pending";
        const statusIcon =
          app.status === "Approved" ? "✅" :
          app.status === "Rejected" ? "❌" : "⏳";
        return `
          <div class="app-row">
            <div class="app-info">
              <div class="app-name">${app.title}</div>
              <div class="app-date">Applied on ${formatDate(app.applied_at)}</div>
            </div>
            <span class="status-badge ${statusClass}">${statusIcon} ${app.status}</span>
          </div>
        `;
      }).join("");
    })
    .catch(() => {
      document.getElementById("myApplications").innerHTML = `<p class="error-text">Failed to load applications.</p>`;
    });
}

// ── ADMIN DASHBOARD ───────────────────────────
const createScholarshipForm = document.getElementById("createScholarshipForm");
if (createScholarshipForm) {
  const token = getToken();
  if (!token) window.location.href = "login.html";

  createScholarshipForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      title: document.getElementById("title").value,
      description: document.getElementById("description").value,
      amount: document.getElementById("amount").value,
      min_cgpa: document.getElementById("min_cgpa").value,
      max_income: document.getElementById("max_income").value,
      total_seats: document.getElementById("seats").value,
      deadline: document.getElementById("deadline").value,
      documents: window.getDocuments ? window.getDocuments() : [],
    };
    const res = await fetch(`${API}/create-scholarship`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const msgEl = document.getElementById("createMsg");
    if (res.ok) {
      msgEl.className = "form-msg success";
      msgEl.textContent = "✅ Scholarship created successfully!";
      createScholarshipForm.reset();
      document.getElementById("docFields").innerHTML = "";
    } else {
      msgEl.className = "form-msg error";
      msgEl.textContent = "❌ " + data.message;
    }
  });

  fetch(`${API}/applications`, {
    headers: { Authorization: "Bearer " + token },
  })
    .then((r) => r.json())
    .then((apps) => {
      const applicationsList = document.getElementById("applicationsList");
      if (!apps.length) {
        applicationsList.innerHTML = `<p class="no-data">No applications yet.</p>`;
        return;
      }
      applicationsList.innerHTML = apps.map((app) => {
        const statusClass =
          app.status === "Approved" ? "status-approved" :
          app.status === "Rejected" ? "status-rejected" : "status-pending";
        const docsHtml = app.documents && app.documents.length > 0
          ? `<div class="app-docs">
               <span class="docs-label">📎 Documents:</span>
               ${app.documents.map(d => `
                 <a href="/${d.file_path}" target="_blank" class="doc-link">📄 ${d.doc_name}</a>
               `).join("")}
             </div>`
          : "";
        return `
          <div class="admin-app-card">
            <div class="admin-card-header">
              <div>
                <div class="admin-app-title">${app.title}</div>
                <div class="admin-app-meta">
                  <strong>${app.student_name}</strong> · ${app.email}
                  ${app.cgpa ? ` · CGPA: ${app.cgpa}` : ""}
                </div>
                ${app.statement ? `<div class="admin-statement">"${app.statement}"</div>` : ""}
                ${docsHtml}
              </div>
              <span class="status-badge ${statusClass}">${app.status}</span>
            </div>
            <div class="admin-card-actions">
              <button class="btn-approve" onclick="updateStatus(${app.id}, 'approve')">✅ Approve</button>
              <button class="btn-reject" onclick="updateStatus(${app.id}, 'reject')">❌ Reject</button>
            </div>
          </div>
        `;
      }).join("");
    })
    .catch(() => {
      document.getElementById("applicationsList").innerHTML = `<p class="error-text">Failed to load applications.</p>`;
    });
}

// ── APPROVE / REJECT ──────────────────────────
window.updateStatus = async function(appId, action) {
  const token = getToken();
  const res = await fetch(`${API}/${action}/${appId}`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token },
  });
  const data = await res.json();
  alert(data.message);
  if (res.ok) location.reload();
};

}); // end DOMContentLoaded
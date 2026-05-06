const BASE_URL = "https://autoclient-v2.onrender.com";
const API_URL = `${BASE_URL}/api/leads`;

const ADMIN_EMAIL_FRONTEND = "austinprinsloo32@gmail.com";

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const logoutBtn = document.getElementById("logoutBtn");
const userDisplay = document.getElementById("userDisplay");

const findLeadsBtn = document.getElementById("findLeadsBtn");
const leadIdeas = document.getElementById("leadIdeas");
const leadIndustry = document.getElementById("leadIndustry");
const leadLocation = document.getElementById("leadLocation");

const leadForm = document.getElementById("leadForm");
const leadList = document.getElementById("leadList");
const recentLeads = document.getElementById("recentLeads");

const serviceInput = document.getElementById("serviceInput");
const messageOutput = document.getElementById("messageOutput");
const copyBtn = document.getElementById("copyBtn");
const messageStyle = document.getElementById("messageStyle");

const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const exportBtn = document.getElementById("exportBtn");

const totalLeads = document.getElementById("totalLeads");
const newLeads = document.getElementById("newLeads");
const contactedLeads = document.getElementById("contactedLeads");
const interestedLeads = document.getElementById("interestedLeads");
const closedLeads = document.getElementById("closedLeads");

const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const navLinks = document.querySelectorAll(".nav-link");
const pageSections = document.querySelectorAll(".page-section");
const adminOnlyLinks = document.querySelectorAll(".admin-only");

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar = document.getElementById("sidebar");

const analyticsGrid = document.getElementById("analyticsGrid");
const nextActionText = document.getElementById("nextActionText");

const refreshAdminBtn = document.getElementById("refreshAdminBtn");
const adminTotalUsers = document.getElementById("adminTotalUsers");
const adminTotalLeads = document.getElementById("adminTotalLeads");
const adminNewLeads = document.getElementById("adminNewLeads");
const adminInterestedLeads = document.getElementById("adminInterestedLeads");
const adminClosedLeads = document.getElementById("adminClosedLeads");
const adminUsersList = document.getElementById("adminUsersList");
const adminLeadsList = document.getElementById("adminLeadsList");

const settingsUserName = document.getElementById("settingsUserName");
const settingsUserEmail = document.getElementById("settingsUserEmail");
const settingsUserRole = document.getElementById("settingsUserRole");

let leads = [];
let editIndex = null;
let currentUser = JSON.parse(localStorage.getItem("autoclient_user")) || null;

const pageInfo = {
  dashboardPage: {
    title: "Dashboard",
    subtitle: "Overview of your lead generation workflow."
  },
  leadsPage: {
    title: "Leads",
    subtitle: "Your dedicated CRM folder for saved leads."
  },
  outreachPage: {
    title: "Outreach",
    subtitle: "Generate, copy, and send better client messages."
  },
  analyticsPage: {
    title: "Analytics",
    subtitle: "Track lead progress and conversion activity."
  },
  adminPage: {
    title: "Admin",
    subtitle: "Owner-only platform overview."
  },
  settingsPage: {
    title: "Settings",
    subtitle: "Manage account and app preferences."
  }
};

function isCurrentAdmin() {
  return (
    currentUser &&
    currentUser.email &&
    currentUser.email.toLowerCase() === ADMIN_EMAIL_FRONTEND
  );
}

function showPage(pageId) {
  if (pageId === "adminPage" && !isCurrentAdmin()) {
    alert("Admin access only.");
    pageId = "dashboardPage";
  }

  pageSections.forEach(section => {
    section.classList.remove("active-page");
  });

  document.getElementById(pageId).classList.add("active-page");

  navLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.page === pageId);
  });

  pageTitle.textContent = pageInfo[pageId].title;
  pageSubtitle.textContent = pageInfo[pageId].subtitle;

  if (pageId === "adminPage") {
    loadAdminDashboard();
  }

  sidebar.classList.remove("open");
}

navLinks.forEach(link => {
  link.addEventListener("click", () => {
    showPage(link.dataset.page);
  });
});

document.querySelectorAll("[data-page-jump]").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.pageJump);
  });
});

mobileMenuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

function showAuth() {
  authSection.style.display = "grid";
  appSection.style.display = "none";
  logoutBtn.style.display = "none";
  userDisplay.textContent = "Not logged in";

  adminOnlyLinks.forEach(link => {
    link.style.display = "none";
  });
}

function showApp() {
  authSection.style.display = "none";
  appSection.style.display = "grid";
  logoutBtn.style.display = "inline-flex";

  currentUser.isAdmin = isCurrentAdmin();
  localStorage.setItem("autoclient_user", JSON.stringify(currentUser));

  userDisplay.textContent = currentUser
    ? `${currentUser.name} ${isCurrentAdmin() ? "• Admin" : ""}`
    : "Logged in";

  adminOnlyLinks.forEach(link => {
    link.style.display = isCurrentAdmin() ? "flex" : "none";
  });

  settingsUserName.textContent = currentUser.name;
  settingsUserEmail.textContent = currentUser.email;
  settingsUserRole.textContent = isCurrentAdmin() ? "Admin" : "User";

  if (!isCurrentAdmin()) {
    showPage("dashboardPage");
  }

  fetchLeads();
}

function checkAuth() {
  currentUser ? showApp() : showAuth();
}

registerForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value.trim();

  try {
    const response = await fetch(`${BASE_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Registration failed");
      return;
    }

    currentUser = data.user;
    currentUser.isAdmin = isCurrentAdmin();

    localStorage.setItem("autoclient_user", JSON.stringify(currentUser));
    registerForm.reset();
    showApp();
  } catch (error) {
    console.error("Register error:", error);
    alert("Could not register. Make sure backend is running.");
  }
});

loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Login failed");
      return;
    }

    currentUser = data.user;
    currentUser.isAdmin = isCurrentAdmin();

    localStorage.setItem("autoclient_user", JSON.stringify(currentUser));
    loginForm.reset();
    showApp();
  } catch (error) {
    console.error("Login error:", error);
    alert("Could not login. Make sure backend is running.");
  }
});

logoutBtn.addEventListener("click", function () {
  currentUser = null;
  leads = [];
  localStorage.removeItem("autoclient_user");
  renderLeads();
  showAuth();
  showPage("dashboardPage");
});

async function fetchLeads() {
  if (!currentUser) return;

  try {
    const response = await fetch(`${API_URL}?userId=${currentUser.id}`);
    const data = await response.json();

    if (!response.ok) {
      leadList.innerHTML = `<p>Could not load leads.</p>`;
      return;
    }

    leads = data;
    renderAll();
  } catch (error) {
    console.error("Fetch leads error:", error);
    leadList.innerHTML = `<p>Could not connect to backend.</p>`;
  }
}

function renderAll() {
  updateDashboard();
  renderLeads();
  renderRecentLeads();
  renderAnalytics();
}

function updateDashboard() {
  totalLeads.textContent = leads.length;
  newLeads.textContent = leads.filter(lead => lead.status === "New").length;
  contactedLeads.textContent = leads.filter(lead => lead.status === "Contacted").length;
  interestedLeads.textContent = leads.filter(lead => lead.status === "Interested").length;
  closedLeads.textContent = leads.filter(lead => lead.status === "Closed").length;

  if (leads.length === 0) {
    nextActionText.textContent = "Add your first lead or use Quick Lead Finder.";
  } else {
    const overdue = leads.filter(lead => isOverdue(lead.nextFollowUp)).length;
    nextActionText.textContent = overdue > 0
      ? `You have ${overdue} overdue follow-up(s).`
      : "Generate outreach for your newest leads.";
  }
}

function renderRecentLeads() {
  recentLeads.innerHTML = "";

  const recent = leads.slice(0, 5);

  if (recent.length === 0) {
    recentLeads.innerHTML = `<div class="mini-item"><strong>No recent leads</strong><span>Add a lead to see it here.</span></div>`;
    return;
  }

  recent.forEach(lead => {
    const div = document.createElement("div");
    div.className = "mini-item";
    div.innerHTML = `
      <strong>${lead.businessName}</strong>
      <span>${lead.status || "New"} • ${lead.priority || "Cold"} Lead</span>
    `;
    recentLeads.appendChild(div);
  });
}

function renderAnalytics() {
  const total = leads.length;
  const contacted = leads.filter(lead => lead.status === "Contacted").length;
  const interested = leads.filter(lead => lead.status === "Interested").length;
  const closed = leads.filter(lead => lead.status === "Closed").length;
  const overdue = leads.filter(lead => isOverdue(lead.nextFollowUp)).length;

  const contactedRate = total ? Math.round((contacted / total) * 100) : 0;
  const interestedRate = total ? Math.round((interested / total) * 100) : 0;
  const closeRate = total ? Math.round((closed / total) * 100) : 0;

  analyticsGrid.innerHTML = `
    <div class="analytics-item"><strong>${contactedRate}%</strong><span>Contacted Rate</span></div>
    <div class="analytics-item"><strong>${interestedRate}%</strong><span>Interested Rate</span></div>
    <div class="analytics-item"><strong>${closeRate}%</strong><span>Close Rate</span></div>
    <div class="analytics-item"><strong>${overdue}</strong><span>Overdue Follow-ups</span></div>
  `;
}

function getFilteredLeads() {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedStatus = filterStatus.value;

  return leads
    .map((lead, index) => ({ lead, index }))
    .filter(({ lead }) => {
      const matchesSearch =
        lead.businessName.toLowerCase().includes(searchTerm) ||
        (lead.contact || "").toLowerCase().includes(searchTerm) ||
        (lead.notes || "").toLowerCase().includes(searchTerm) ||
        (lead.link || "").toLowerCase().includes(searchTerm);

      const matchesStatus = selectedStatus === "all" || lead.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
}

function isOverdue(dateString) {
  if (!dateString) return false;

  const today = new Date();
  const followUpDate = new Date(dateString);

  today.setHours(0, 0, 0, 0);
  followUpDate.setHours(0, 0, 0, 0);

  return followUpDate < today;
}

function renderLeads() {
  if (!leadList) return;

  leadList.innerHTML = "";

  const filteredLeads = getFilteredLeads();

  if (leads.length === 0) {
    leadList.innerHTML = `<p>No leads added yet. Add your first potential client above.</p>`;
    return;
  }

  if (filteredLeads.length === 0) {
    leadList.innerHTML = `<p>No leads match your search or filter.</p>`;
    return;
  }

  filteredLeads.forEach(({ lead, index }) => {
    const div = document.createElement("div");
    div.className = isOverdue(lead.nextFollowUp)
      ? "lead-card overdue-lead"
      : "lead-card";

    div.innerHTML = `
      <div class="lead-card-top">
        <div>
          <h3>${lead.businessName}</h3>
          <span class="priority-badge">${lead.priority || "Cold"} Lead</span>
        </div>
        <span class="status-badge">${lead.status || "New"}</span>
      </div>

      <div class="lead-meta">
        <p><strong>Link:</strong> ${lead.link ? `<a href="${lead.link}" target="_blank">Open</a>` : "N/A"}</p>
        <p><strong>Contact:</strong> ${lead.contact || "N/A"}</p>
        <p><strong>Notes:</strong> ${lead.notes || "None"}</p>
        <p><strong>Added:</strong> ${lead.createdAt || "N/A"}</p>
        <p><strong>Last Contacted:</strong> ${lead.lastContacted || "Not yet"}</p>
        <p>
          <strong>Next Follow-up:</strong> 
          ${lead.nextFollowUp || "Not set"}
          ${isOverdue(lead.nextFollowUp) ? `<span class="overdue-badge">Overdue</span>` : ""}
        </p>
      </div>

      <select onchange="updateStatus(${index}, this.value)">
        <option ${lead.status === "New" ? "selected" : ""}>New</option>
        <option ${lead.status === "Contacted" ? "selected" : ""}>Contacted</option>
        <option ${lead.status === "Replied" ? "selected" : ""}>Replied</option>
        <option ${lead.status === "Interested" ? "selected" : ""}>Interested</option>
        <option ${lead.status === "Closed" ? "selected" : ""}>Closed</option>
        <option ${lead.status === "Rejected" ? "selected" : ""}>Rejected</option>
      </select>

      <div class="lead-actions">
        <button class="primary-btn" onclick="handleGenerate(${index})">AI Outreach</button>
        <button class="whatsapp-btn" onclick="sendWhatsApp(${index})">WhatsApp</button>
        <button class="linkedin-btn" onclick="sendLinkedIn(${index})">LinkedIn</button>
        <button class="secondary-btn" onclick="setFollowUp(${index})">Follow-up</button>
        <button class="secondary-btn" onclick="editLead(${index})">Edit</button>
        <button class="secondary-btn" onclick="markContacted(${index})">Contacted</button>
        <button class="delete-btn" onclick="deleteLead(${index})">Delete</button>
      </div>
    `;

    leadList.appendChild(div);
  });
}

leadForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (!currentUser) {
    alert("Please login first.");
    return;
  }

  const businessName = document.getElementById("businessName").value.trim();
  const leadLink = document.getElementById("leadLink").value.trim();
  const contactInfo = document.getElementById("contactInfo").value.trim();
  const priority = document.getElementById("priority").value;
  const notes = document.getElementById("notes").value.trim();

  const leadData = {
    userId: currentUser.id,
    businessName,
    link: leadLink,
    contact: contactInfo,
    priority,
    notes,
    status: "New",
    createdAt: new Date().toLocaleString()
  };

  try {
    if (editIndex !== null) {
      const leadId = leads[editIndex].id;

      await fetch(`${API_URL}/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leadData,
          status: leads[editIndex].status,
          createdAt: leads[editIndex].createdAt,
          lastContacted: leads[editIndex].lastContacted || "",
          nextFollowUp: leads[editIndex].nextFollowUp || ""
        })
      });

      editIndex = null;
      leadForm.querySelector("button[type='submit']").textContent = "Add Lead";
    } else {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadData)
      });
    }

    leadForm.reset();
    fetchLeads();
  } catch (error) {
    console.error("Save lead error:", error);
    alert("Could not save lead.");
  }
});

function editLead(index) {
  const lead = leads[index];

  document.getElementById("businessName").value = lead.businessName || "";
  document.getElementById("leadLink").value = lead.link || "";
  document.getElementById("contactInfo").value = lead.contact || "";
  document.getElementById("priority").value = lead.priority || "Cold";
  document.getElementById("notes").value = lead.notes || "";

  editIndex = index;
  leadForm.querySelector("button[type='submit']").textContent = "Update Lead";
  showPage("leadsPage");
}

async function deleteLead(index) {
  const confirmDelete = confirm("Delete this lead?");
  if (!confirmDelete) return;

  try {
    await fetch(`${API_URL}/${leads[index].id}`, { method: "DELETE" });
    fetchLeads();
  } catch (error) {
    console.error("Delete lead error:", error);
    alert("Could not delete lead.");
  }
}

async function updateStatus(index, newStatus) {
  const lead = leads[index];

  try {
    await fetch(`${API_URL}/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...lead, status: newStatus })
    });

    fetchLeads();
  } catch (error) {
    console.error("Update status error:", error);
    alert("Could not update status.");
  }
}

function markContacted(index) {
  updateStatus(index, "Contacted");
}

function setFollowUp(index) {
  const date = prompt("Enter next follow-up date (YYYY-MM-DD)");
  if (!date) return;

  const lead = leads[index];

  updateLead(lead.id, {
    ...lead,
    nextFollowUp: date,
    lastContacted: new Date().toISOString().split("T")[0]
  });
}

async function updateLead(leadId, payload) {
  try {
    await fetch(`${API_URL}/${leadId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    fetchLeads();
  } catch (error) {
    console.error("Update lead error:", error);
    alert("Could not update lead");
  }
}

function generateMessage(lead) {
  const service = serviceInput.value.trim() || "my services";
  const notes = lead.notes ? lead.notes.trim() : "";
  const style = messageStyle.value;

  const personalLine = notes
    ? `I noticed this about your business: ${notes}`
    : `I wanted to reach out because your business looks like it could benefit from extra support.`;

  if (style === "casual") {
    return `Hi ${lead.businessName},

I came across your business and thought I would reach out.

${personalLine}

I help businesses with ${service}, and I think I could possibly help you get better results.

Would you be open to a quick chat?

Thanks,
${currentUser ? currentUser.name : ""}`;
  }

  if (style === "direct") {
    return `Hi ${lead.businessName},

I’ll keep this short.

${personalLine}

I help businesses with ${service}. If you want more clients, a better online presence, or a smoother system, I can help.

Are you open to discussing how I could help your business grow?

Regards,
${currentUser ? currentUser.name : ""}`;
  }

  if (style === "followup") {
    return `Hi ${lead.businessName},

Just following up on my previous message.

I help businesses with ${service}, and I still think there may be a good opportunity to help your business improve results.

Would now be a better time for a quick conversation?

Kind regards,
${currentUser ? currentUser.name : ""}`;
  }

  return `Good day ${lead.businessName},

I hope you are well.

${personalLine}

I help businesses with ${service}. I believe there may be an opportunity to support your business by improving visibility, attracting more customers, or saving valuable time.

Would you be open to a brief conversation this week?

Kind regards,
${currentUser ? currentUser.name : ""}`;
}

async function handleGenerate(index) {
  const lead = leads[index];

  showPage("outreachPage");
  messageOutput.value = "Generating outreach message...";

  try {
    const response = await fetch(`${BASE_URL}/api/generate-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: lead.businessName,
        service: serviceInput.value.trim() || "my services",
        notes: lead.notes || "",
        style: messageStyle.value,
        userName: currentUser ? currentUser.name : "AutoClient User"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Message failed");
    }

    messageOutput.value = data.message;
  } catch (error) {
    console.error("Message error:", error);
    messageOutput.value = generateMessage(lead);
  }
}

function sendWhatsApp(index) {
  const lead = leads[index];
  const message = generateMessage(lead);
  const encodedMessage = encodeURIComponent(message);

  const phone = (lead.contact || "").replace(/\D/g, "");
  const whatsappURL = phone
    ? `https://wa.me/${phone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;

  window.open(whatsappURL, "_blank");
}

function sendLinkedIn(index) {
  const lead = leads[index];
  const message = generateMessage(lead);

  navigator.clipboard.writeText(message);

  const searchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(lead.businessName)}`;
  window.open(searchUrl, "_blank");

  alert("Message copied. Paste it into LinkedIn chat.");
}

copyBtn.addEventListener("click", async function () {
  if (!messageOutput.value.trim()) {
    copyBtn.textContent = "No message";
    setTimeout(() => copyBtn.textContent = "Copy Message", 1500);
    return;
  }

  try {
    await navigator.clipboard.writeText(messageOutput.value);
  } catch (error) {
    messageOutput.select();
    document.execCommand("copy");
  }

  copyBtn.textContent = "Copied!";
  setTimeout(() => copyBtn.textContent = "Copy Message", 1500);
});

function renderLeadIdeas(ideas) {
  leadIdeas.innerHTML = "";

  ideas.forEach(idea => {
    const div = document.createElement("div");
    div.className = "lead-idea-card";

    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(idea.businessName)}`;

    div.innerHTML = `
      <div class="lead-idea-info">
        <strong>${idea.businessName}</strong>
        <p>${idea.notes}</p>
      </div>

      <div class="lead-idea-actions">
        <a href="${googleSearchUrl}" target="_blank" class="google-search-btn">Search</a>
        <button class="add-idea-btn">+ Add</button>
      </div>
    `;

    div.querySelector(".add-idea-btn").addEventListener("click", async () => {
      if (!currentUser) {
        alert("Login first");
        return;
      }

      const newLead = {
        userId: currentUser.id,
        businessName: idea.businessName,
        link: googleSearchUrl,
        contact: "",
        priority: "Warm",
        notes: idea.notes,
        status: "New",
        createdAt: new Date().toLocaleString()
      };

      try {
        await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newLead)
        });

        fetchLeads();
      } catch (error) {
        console.error("Add idea error:", error);
        alert("Could not add lead");
      }
    });

    leadIdeas.appendChild(div);
  });
}

findLeadsBtn.addEventListener("click", async function () {
  const industry = leadIndustry.value.trim();
  const location = leadLocation.value.trim();

  if (!industry || !location) {
    alert("Enter both industry and location");
    return;
  }

  leadIdeas.innerHTML = "Finding leads...";

  try {
    const response = await fetch(`${BASE_URL}/api/find-leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry, location })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed");
    }

    renderLeadIdeas(data);
  } catch (error) {
    console.error("Lead finder error:", error);
    leadIdeas.innerHTML = "<p>Could not generate leads.</p>";
  }
});

function exportToCSV() {
  if (leads.length === 0) {
    alert("No leads to export");
    return;
  }

  const headers = ["Business Name", "Link", "Contact", "Priority", "Status", "Notes", "Created"];

  const rows = leads.map(lead => [
    lead.businessName,
    lead.link,
    lead.contact,
    lead.priority,
    lead.status,
    lead.notes,
    lead.createdAt
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(value => `"${String(value || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "autoclient_leads.csv";
  link.click();

  URL.revokeObjectURL(url);
}

searchInput.addEventListener("input", renderLeads);
filterStatus.addEventListener("change", renderLeads);
exportBtn.addEventListener("click", exportToCSV);

async function loadAdminDashboard() {
  if (!isCurrentAdmin()) {
    alert("Admin access only.");
    showPage("dashboardPage");
    return;
  }

  try {
    const statsRes = await fetch(`${BASE_URL}/api/admin/stats?userId=${currentUser.id}`);
    const usersRes = await fetch(`${BASE_URL}/api/admin/users?userId=${currentUser.id}`);
    const leadsRes = await fetch(`${BASE_URL}/api/admin/leads?userId=${currentUser.id}`);

    const stats = await statsRes.json();
    const users = await usersRes.json();
    const allLeads = await leadsRes.json();

    if (!statsRes.ok || !usersRes.ok || !leadsRes.ok) {
      throw new Error("Admin request failed");
    }

    adminTotalUsers.textContent = stats.totalUsers;
    adminTotalLeads.textContent = stats.totalLeads;
    adminNewLeads.textContent = stats.newLeads;
    adminInterestedLeads.textContent = stats.interestedLeads;
    adminClosedLeads.textContent = stats.closedLeads;

    adminUsersList.innerHTML = users.length
      ? ""
      : `<div class="table-row"><strong>No users found</strong></div>`;

    users.forEach(user => {
      const div = document.createElement("div");
      div.className = "table-row";
      div.innerHTML = `
        <strong>${user.name}</strong>
        <span>${user.email}</span>
        <span>Joined: ${user.createdAt || "N/A"}</span>
      `;
      adminUsersList.appendChild(div);
    });

    adminLeadsList.innerHTML = allLeads.length
      ? ""
      : `<div class="table-row"><strong>No leads found</strong></div>`;

    allLeads.slice(0, 30).forEach(lead => {
      const div = document.createElement("div");
      div.className = "table-row";
      div.innerHTML = `
        <strong>${lead.businessName}</strong>
        <span>${lead.status || "New"} • ${lead.priority || "Cold"}</span>
        <span>Owner: ${lead.ownerName || "Unknown"} — ${lead.ownerEmail || "N/A"}</span>
      `;
      adminLeadsList.appendChild(div);
    });

  } catch (error) {
    console.error("Admin dashboard error:", error);
    alert("Could not load admin dashboard.");
  }
}

if (refreshAdminBtn) {
  refreshAdminBtn.addEventListener("click", loadAdminDashboard);
}

checkAuth();
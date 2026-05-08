const BASE_URL =
  window.location.hostname.includes("github.io")
    ? "https://autoclient-v2.onrender.com"
    : "";

const API_URL = `${BASE_URL}/api/leads`;
const ACTIVITIES_URL = `${BASE_URL}/api/activities`;
const ACTIVITY_LOG_URL = `${BASE_URL}/api/activities/log`;
const SEND_EMAIL_URL = `${BASE_URL}/api/send-email`;
const MY_PLAN_URL = `${BASE_URL}/api/my-plan`;
const CHECKOUT_URL = `${BASE_URL}/api/create-checkout-session`;
const BILLING_PORTAL_URL = `${BASE_URL}/api/create-billing-portal-session`;

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
const recentActivity = document.getElementById("recentActivity");

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

const themeToggle = document.getElementById("themeToggle");

let leads = [];
let activities = [];
let editIndex = null;
let leadStatusChart;
let outreachChart;
let currentUser = JSON.parse(localStorage.getItem("autoclient_user")) || null;

let currentPlan = {
  plan: "free",
  planName: "Free",
  subscriptionStatus: "inactive",
  features: {
    max_leads: 10,
    ai_outreach: false,
    kanban: false,
    analytics: false,
    email_integration: false,
    lead_finder: true,
    csv_export: false
  }
};

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
    subtitle: "Manage account, billing, and app preferences."
  }
};

function injectSmartCRMStyles() {
  if (document.getElementById("smartCrmStyles")) return;

  const style = document.createElement("style");
  style.id = "smartCrmStyles";
  style.textContent = `
    .smart-dashboard-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-top: 0;
    }

    .smart-widget {
      background: rgba(255,255,255,0.96);
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 18px;
      box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
      display: grid;
      gap: 8px;
    }

    .smart-widget span {
      font-size: 12px;
      font-weight: 900;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .smart-widget strong {
      font-size: 26px;
      line-height: 1;
      color: var(--navy);
    }

    .smart-widget p {
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }

    .lead-score-badge {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      border-radius: 999px;
      padding: 7px 11px;
      font-size: 12px;
      font-weight: 900;
      margin-top: 8px;
    }

    .score-hot {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .score-warm {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .score-cold {
      background: #e0f2fe;
      color: #075985;
      border: 1px solid #bae6fd;
    }

    .email-btn {
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: white;
    }

    .notification-panel {
      display: grid;
      gap: 12px;
    }

    .notification-item {
      background: #f8fafc;
      border: 1px solid var(--line);
      border-left: 5px solid var(--blue);
      border-radius: 16px;
      padding: 14px;
      display: grid;
      gap: 4px;
    }

    .notification-item strong {
      font-size: 14px;
    }

    .notification-item span {
      color: var(--muted);
      font-size: 13px;
    }

    .notification-danger {
      border-left-color: #ef4444;
    }

    .notification-warning {
      border-left-color: #f59e0b;
    }

    .notification-success {
      border-left-color: #22c55e;
    }

    body.dark-mode .smart-widget,
    body.dark-mode .notification-item {
      background: #0f172a;
      border-color: #1e293b;
      color: #e5e7eb;
    }

    body.dark-mode .smart-widget strong,
    body.dark-mode .notification-item strong {
      color: #f8fafc;
    }

    @media (max-width: 1050px) {
      .smart-dashboard-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 700px) {
      .smart-dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toastContainer");

  if (!toastContainer) {
    alert(message);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3200);
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    console.error("Response was not valid JSON:", error);
    return {
      error: "Server returned an invalid response. Check Render logs."
    };
  }
}

function normalizeLead(lead) {
  return {
    id: lead.id,
    userId: lead.userId || lead.userid,
    businessName: lead.businessName || lead.businessname || "",
    link: lead.link || "",
    contact: lead.contact || "",
    priority: lead.priority || "Cold",
    notes: lead.notes || "",
    status: lead.status || "New",
    createdAt: lead.createdAt || lead.createdat || "",
    lastContacted: lead.lastContacted || lead.lastcontacted || "",
    nextFollowUp: lead.nextFollowUp || lead.nextfollowup || "",
    ownerName: lead.ownerName || lead.ownername || "",
    ownerEmail: lead.ownerEmail || lead.owneremail || ""
  };
}

function normalizeActivity(activity) {
  return {
    id: activity.id,
    userId: activity.userId || activity.userid,
    leadId: activity.leadId || activity.leadid,
    action: activity.action || "Activity",
    details: activity.details || "",
    createdAt: activity.createdAt || activity.createdat || ""
  };
}

function isCurrentAdmin() {
  return (
    currentUser &&
    currentUser.email &&
    currentUser.email.toLowerCase() === ADMIN_EMAIL_FRONTEND
  );
}

async function loadUserPlan() {
  if (!currentUser) return;

  try {
    const response = await fetch(`${MY_PLAN_URL}?userId=${currentUser.id}`);
    const data = await readJsonResponse(response);

    if (!response.ok) {
      console.error("Plan fetch error:", data);
      return;
    }

    currentPlan = data;
    renderPlanUI();
  } catch (error) {
    console.error("Could not load user plan:", error);
  }
}

function renderPlanUI() {
  const planBadge = document.getElementById("planBadge");
  const settingsUserPlan = document.getElementById("settingsUserPlan");
  const subscriptionStatus = document.getElementById("subscriptionStatus");
  const planLimits = document.getElementById("planLimits");

  if (planBadge) {
    planBadge.textContent = `${currentPlan.planName || currentPlan.plan.toUpperCase()} PLAN`;
    planBadge.className = `plan-badge ${currentPlan.plan}`;
  }

  if (settingsUserPlan) {
    settingsUserPlan.textContent = `${currentPlan.planName || currentPlan.plan.toUpperCase()} PLAN`;
  }

  if (subscriptionStatus) {
    subscriptionStatus.textContent = currentPlan.subscriptionStatus || "inactive";
  }

  if (planLimits) {
    planLimits.textContent = `Lead limit: ${currentPlan.features.max_leads}`;
  }
}

function requireFeature(featureName) {
  if (!currentPlan || !currentPlan.features || !currentPlan.features[featureName]) {
    showToast("Upgrade to Pro or Agency to unlock this feature.", "warning");
    showPage("settingsPage");
    return false;
  }

  return true;
}

function canAddMoreLeads() {
  const maxLeads = currentPlan.features.max_leads || 10;

  if (leads.length >= maxLeads) {
    showToast(`Your ${currentPlan.planName || "Free"} plan limit is ${maxLeads} leads. Upgrade to add more.`, "warning");
    showPage("settingsPage");
    return false;
  }

  return true;
}

async function startCheckout(plan) {
  if (!currentUser) {
    showToast("Please login first.", "warning");
    return;
  }

  try {
    showToast(`Opening ${plan.toUpperCase()} checkout...`, "info");

    const response = await fetch(CHECKOUT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUser.id,
        plan
      })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      showToast(data.error || "Could not start checkout.", "error");
      return;
    }

    window.location.href = data.url;
  } catch (error) {
    console.error("Checkout error:", error);
    showToast("Could not connect to Stripe checkout.", "error");
  }
}

async function openBillingPortal() {
  if (!currentUser) {
    showToast("Please login first.", "warning");
    return;
  }

  try {
    const response = await fetch(BILLING_PORTAL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUser.id
      })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      showToast(data.error || "Billing portal unavailable.", "warning");
      return;
    }

    window.location.href = data.url;
  } catch (error) {
    console.error("Billing portal error:", error);
    showToast("Could not open billing portal.", "error");
  }
}

function handleBillingRedirectNotice() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("billing") === "success") {
    showToast("Payment successful. Your plan will update after Stripe confirms the subscription.", "success");
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (params.get("billing") === "cancelled") {
    showToast("Checkout cancelled. No payment was made.", "info");
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function isToday(dateString) {
  if (!dateString) return false;

  const today = new Date();
  const targetDate = new Date(dateString);

  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  return today.getTime() === targetDate.getTime();
}

function isOverdue(dateString) {
  if (!dateString) return false;

  const today = new Date();
  const followUpDate = new Date(dateString);

  today.setHours(0, 0, 0, 0);
  followUpDate.setHours(0, 0, 0, 0);

  return followUpDate < today;
}

function getLeadActivityCount(leadId) {
  return activities.filter(activity => Number(activity.leadId) === Number(leadId)).length;
}

function getLeadScore(lead) {
  const activityCount = getLeadActivityCount(lead.id);
  const status = lead.status || "New";
  const priority = lead.priority || "Cold";

  let score = 0;
  let reasons = [];

  if (priority === "Hot") {
    score += 35;
    reasons.push("High priority");
  }

  if (priority === "Warm") {
    score += 18;
    reasons.push("Warm priority");
  }

  if (status === "Interested") {
    score += 40;
    reasons.push("Interested");
  }

  if (status === "Contacted") {
    score += 22;
    reasons.push("Contacted");
  }

  if (status === "Replied") {
    score += 30;
    reasons.push("Replied");
  }

  if (status === "Closed") {
    score += 50;
    reasons.push("Closed");
  }

  if (lead.nextFollowUp) {
    score += 12;
    reasons.push("Follow-up scheduled");
  }

  if (isToday(lead.nextFollowUp)) {
    score += 18;
    reasons.push("Follow-up today");
  }

  if (isOverdue(lead.nextFollowUp)) {
    score -= 15;
    reasons.push("Overdue");
  }

  if (activityCount >= 3) {
    score += 20;
    reasons.push("Active lead");
  } else if (activityCount > 0) {
    score += 10;
    reasons.push("Recent activity");
  }

  if (status === "Rejected") {
    score -= 40;
    reasons.push("Rejected");
  }

  if (score >= 55) {
    return {
      label: "🔥 HOT",
      level: "hot",
      score,
      reason: reasons.slice(0, 2).join(" • ") || "High opportunity"
    };
  }

  if (score >= 25) {
    return {
      label: "🌤 WARM",
      level: "warm",
      score,
      reason: reasons.slice(0, 2).join(" • ") || "Needs follow-up"
    };
  }

  return {
    label: "❄ COLD",
    level: "cold",
    score,
    reason: reasons.slice(0, 2).join(" • ") || "Needs attention"
  };
}

function getSmartMetrics() {
  const hotLeads = leads.filter(lead => getLeadScore(lead).level === "hot");
  const warmLeads = leads.filter(lead => getLeadScore(lead).level === "warm");
  const coldLeads = leads.filter(lead => getLeadScore(lead).level === "cold");
  const overdueFollowUps = leads.filter(lead => isOverdue(lead.nextFollowUp));
  const todayFollowUps = leads.filter(lead => isToday(lead.nextFollowUp));
  const activeLeads = leads.filter(lead =>
    ["Contacted", "Replied", "Interested", "Closed"].includes(lead.status)
  );

  const closed = leads.filter(lead => lead.status === "Closed").length;
  const conversionRate = leads.length ? Math.round((closed / leads.length) * 100) : 0;
  const pipelineHealth = leads.length ? Math.round((activeLeads.length / leads.length) * 100) : 0;

  return {
    hotLeads,
    warmLeads,
    coldLeads,
    overdueFollowUps,
    todayFollowUps,
    activeLeads,
    conversionRate,
    pipelineHealth
  };
}

function renderSmartDashboardWidgets() {
  const dashboardPage = document.getElementById("dashboardPage");
  if (!dashboardPage) return;

  let smartGrid = document.getElementById("smartDashboardGrid");

  if (!smartGrid) {
    smartGrid = document.createElement("div");
    smartGrid.id = "smartDashboardGrid";
    smartGrid.className = "smart-dashboard-grid";

    const dashboardStats = dashboardPage.querySelector(".dashboard");
    if (dashboardStats) {
      dashboardStats.insertAdjacentElement("afterend", smartGrid);
    } else {
      dashboardPage.appendChild(smartGrid);
    }
  }

  const metrics = getSmartMetrics();

  smartGrid.innerHTML = `
    <div class="smart-widget">
      <span>🔥 Hot Leads</span>
      <strong>${metrics.hotLeads.length}</strong>
      <p>Best opportunities to contact now.</p>
    </div>

    <div class="smart-widget">
      <span>⏰ Due Today</span>
      <strong>${metrics.todayFollowUps.length}</strong>
      <p>Follow-ups scheduled for today.</p>
    </div>

    <div class="smart-widget">
      <span>⚠️ Overdue</span>
      <strong>${metrics.overdueFollowUps.length}</strong>
      <p>Follow-ups that need attention.</p>
    </div>

    <div class="smart-widget">
      <span>📈 Pipeline Health</span>
      <strong>${metrics.pipelineHealth}%</strong>
      <p>${metrics.conversionRate}% conversion rate.</p>
    </div>
  `;
}

function getNotifications() {
  const metrics = getSmartMetrics();
  const notifications = [];

  if (metrics.overdueFollowUps.length > 0) {
    notifications.push({
      type: "danger",
      title: `⚠️ ${metrics.overdueFollowUps.length} overdue follow-up(s)`,
      message: "These leads need attention before they go cold."
    });
  }

  if (metrics.todayFollowUps.length > 0) {
    notifications.push({
      type: "warning",
      title: `⏰ ${metrics.todayFollowUps.length} follow-up(s) due today`,
      message: "Contact these leads today to keep your pipeline active."
    });
  }

  if (metrics.hotLeads.length > 0) {
    notifications.push({
      type: "success",
      title: `🔥 ${metrics.hotLeads.length} hot lead(s) detected`,
      message: "Prioritize these opportunities first."
    });
  }

  if (leads.length > 0 && metrics.pipelineHealth < 35) {
    notifications.push({
      type: "warning",
      title: "📉 Pipeline needs movement",
      message: "Move more leads from New into Contacted or Interested."
    });
  }

  if (leads.length === 0) {
    notifications.push({
      type: "warning",
      title: "📌 No leads yet",
      message: "Add your first lead or use Quick Lead Finder."
    });
  }

  if (notifications.length === 0) {
    notifications.push({
      type: "success",
      title: "✅ Pipeline looks healthy",
      message: "No urgent CRM issues right now."
    });
  }

  return notifications;
}

function renderNotifications() {
  const dashboardPage = document.getElementById("dashboardPage");
  if (!dashboardPage) return;

  let panelCard = document.getElementById("notificationCard");

  if (!panelCard) {
    panelCard = document.createElement("div");
    panelCard.id = "notificationCard";
    panelCard.className = "card";

    panelCard.innerHTML = `
      <div class="section-heading">
        <span class="step">🔔</span>
        <div>
          <h2>Smart Notifications</h2>
          <p>AutoClient alerts based on follow-ups, lead scores, and pipeline health.</p>
        </div>
      </div>
      <div id="notificationPanel" class="notification-panel"></div>
    `;

    const smartGrid = document.getElementById("smartDashboardGrid");

    if (smartGrid) {
      smartGrid.insertAdjacentElement("afterend", panelCard);
    } else {
      dashboardPage.appendChild(panelCard);
    }
  }

  const panel = document.getElementById("notificationPanel");
  if (!panel) return;

  const notifications = getNotifications();

  panel.innerHTML = notifications.map(notification => `
    <div class="notification-item notification-${notification.type}">
      <strong>${notification.title}</strong>
      <span>${notification.message}</span>
    </div>
  `).join("");
}

async function logActivity(leadId, action, details) {
  if (!currentUser) return;

  try {
    await fetch(ACTIVITY_LOG_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUser.id,
        leadId,
        action,
        details
      })
    });

    await fetchActivities();
  } catch (error) {
    console.error("Activity log error:", error);
  }
}

async function fetchActivities() {
  if (!currentUser) return;

  try {
    const response = await fetch(`${ACTIVITIES_URL}?userId=${currentUser.id}`);
    const data = await readJsonResponse(response);

    if (!response.ok) {
      console.error("Activity fetch error:", data);
      return;
    }

    activities = data.map(normalizeActivity);
    renderRecentActivity();
  } catch (error) {
    console.error("Fetch activities error:", error);
  }
}

function renderRecentActivity() {
  if (!recentActivity) return;

  recentActivity.innerHTML = "";

  if (!activities.length) {
    recentActivity.innerHTML = `
      <div class="activity-item">
        <strong>No recent activity</strong>
        <span>Your CRM actions will appear here.</span>
      </div>
    `;
    return;
  }

  activities.slice(0, 8).forEach(activity => {
    const div = document.createElement("div");
    div.className = "activity-item";

    div.innerHTML = `
      <strong>${activity.action}</strong>
      <span>${activity.details || "No details available."}</span>
      <div class="activity-time">${activity.createdAt || "Just now"}</div>
    `;

    recentActivity.appendChild(div);
  });
}

function showPage(pageId) {
  if (pageId === "adminPage" && !isCurrentAdmin()) {
    showToast("Admin access only.", "warning");
    pageId = "dashboardPage";
  }

  if (pageId === "analyticsPage" && !currentPlan.features.analytics) {
    showToast("Analytics are available on Pro or Agency plans.", "warning");
    pageId = "settingsPage";
  }

  pageSections.forEach(section => section.classList.remove("active-page"));

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add("active-page");
  }

  navLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.page === pageId);
  });

  if (pageInfo[pageId] && pageTitle && pageSubtitle) {
    pageTitle.textContent = pageInfo[pageId].title;
    pageSubtitle.textContent = pageInfo[pageId].subtitle;
  }

  if (pageId === "adminPage") {
    loadAdminDashboard();
  }

  if (sidebar) {
    sidebar.classList.remove("open");
  }
}

navLinks.forEach(link => {
  link.addEventListener("click", () => showPage(link.dataset.page));
});

document.querySelectorAll("[data-page-jump]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.pageJump));
});

if (mobileMenuBtn && sidebar) {
  mobileMenuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}

function showAuth() {
  authSection.style.display = "grid";
  appSection.style.display = "none";
  logoutBtn.style.display = "none";
  userDisplay.textContent = "Not logged in";

  adminOnlyLinks.forEach(link => {
    link.style.display = "none";
  });
}

async function showApp() {
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

  await loadUserPlan();
  await fetchLeads();
  handleBillingRedirectNotice();
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
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        email,
        password
      })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      showToast(data.error || "Registration failed.", "error");
      alert(data.error || "Registration failed.");
      return;
    }

    currentUser = data.user;
    currentUser.isAdmin = isCurrentAdmin();

    localStorage.setItem("autoclient_user", JSON.stringify(currentUser));
    registerForm.reset();

    showToast("Account created successfully.", "success");
    showApp();
  } catch (error) {
    console.error("Register error:", error);
    showToast("Could not register. Make sure backend is running.", "error");
    alert("Register connection error. Check Console and Render logs.");
  }
});

loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      showToast(data.error || "Login failed.", "error");
      alert(data.error || "Login failed.");
      return;
    }

    currentUser = data.user;
    currentUser.isAdmin = isCurrentAdmin();

    localStorage.setItem("autoclient_user", JSON.stringify(currentUser));
    loginForm.reset();

    showToast("Logged in successfully.", "success");
    showApp();
  } catch (error) {
    console.error("Login error:", error);
    showToast("Could not login. Make sure backend is running.", "error");
    alert("Login connection error. Check Console and Render logs.");
  }
});

logoutBtn.addEventListener("click", function () {
  currentUser = null;
  leads = [];
  activities = [];

  localStorage.removeItem("autoclient_user");

  renderLeads();
  renderRecentActivity();
  showAuth();
  showPage("dashboardPage");

  showToast("Logged out successfully.", "info");
});

async function fetchLeads() {
  if (!currentUser) return;

  try {
    const response = await fetch(`${API_URL}?userId=${currentUser.id}`);
    const data = await readJsonResponse(response);

    if (!response.ok) {
      console.error("Fetch leads server error:", data);
      leadList.innerHTML = `<p>Could not load leads.</p>`;
      showToast("Could not load leads.", "error");
      return;
    }

    leads = data.map(normalizeLead);

    await fetchActivities();

    renderAll();
  } catch (error) {
    console.error("Fetch leads connection error:", error);
    leadList.innerHTML = `<p>Could not connect to backend.</p>`;
    showToast("Could not connect to backend.", "error");
  }
}

function renderAll() {
  updateDashboard();
  renderLeads();
  renderRecentLeads();
  renderAnalytics();
  renderAnalyticsCharts();
  renderKanbanBoard();
  renderRecentActivity();
  renderSmartDashboardWidgets();
  renderNotifications();
  renderPlanUI();
}

function animateCounter(element, target, duration = 700) {
  if (!element) return;

  const start = Number(element.textContent) || 0;
  const startTime = performance.now();

  function updateCounter(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const value = Math.floor(start + (target - start) * progress);

    element.textContent = value;

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      element.textContent = target;
    }
  }

  requestAnimationFrame(updateCounter);
}

function updateDashboard() {
  animateCounter(totalLeads, leads.length);
  animateCounter(newLeads, leads.filter(lead => lead.status === "New").length);
  animateCounter(contactedLeads, leads.filter(lead => lead.status === "Contacted").length);
  animateCounter(interestedLeads, leads.filter(lead => lead.status === "Interested").length);
  animateCounter(closedLeads, leads.filter(lead => lead.status === "Closed").length);

  const metrics = getSmartMetrics();

  if (leads.length === 0) {
    nextActionText.textContent = "Add your first lead or use Quick Lead Finder.";
  } else if (metrics.hotLeads.length > 0) {
    nextActionText.textContent = `Focus on ${metrics.hotLeads.length} hot lead(s) first.`;
  } else if (metrics.overdueFollowUps.length > 0) {
    nextActionText.textContent = `You have ${metrics.overdueFollowUps.length} overdue follow-up(s).`;
  } else if (metrics.todayFollowUps.length > 0) {
    nextActionText.textContent = `${metrics.todayFollowUps.length} follow-up(s) are due today.`;
  } else {
    nextActionText.textContent = "Generate outreach for your newest leads.";
  }
}

function renderRecentLeads() {
  recentLeads.innerHTML = "";

  const recent = leads.slice(0, 5);

  if (recent.length === 0) {
    recentLeads.innerHTML = `
      <div class="mini-item">
        <strong>No recent leads</strong>
        <span>Add a lead to see it here.</span>
      </div>
    `;
    return;
  }

  recent.forEach(lead => {
    const score = getLeadScore(lead);
    const div = document.createElement("div");
    div.className = "mini-item";

    div.innerHTML = `
      <strong>${lead.businessName}</strong>
      <span>${score.label} • ${lead.status || "New"} • ${lead.priority || "Cold"} Lead</span>
    `;

    recentLeads.appendChild(div);
  });
}

function renderAnalytics() {
  if (!analyticsGrid) return;

  if (!currentPlan.features.analytics) {
    analyticsGrid.innerHTML = `
      <div class="analytics-item">
        <strong>🔒 Locked</strong>
        <span>Analytics are available on Pro or Agency plans.</span>
      </div>
    `;
    return;
  }

  const total = leads.length;
  const contacted = leads.filter(lead => lead.status === "Contacted").length;
  const interested = leads.filter(lead => lead.status === "Interested").length;
  const closed = leads.filter(lead => lead.status === "Closed").length;
  const overdue = leads.filter(lead => isOverdue(lead.nextFollowUp)).length;
  const hot = leads.filter(lead => getLeadScore(lead).level === "hot").length;

  const contactedRate = total ? Math.round((contacted / total) * 100) : 0;
  const interestedRate = total ? Math.round((interested / total) * 100) : 0;
  const closeRate = total ? Math.round((closed / total) * 100) : 0;

  analyticsGrid.innerHTML = `
    <div class="analytics-item"><strong>${contactedRate}%</strong><span>Contacted Rate</span></div>
    <div class="analytics-item"><strong>${interestedRate}%</strong><span>Interested Rate</span></div>
    <div class="analytics-item"><strong>${closeRate}%</strong><span>Close Rate</span></div>
    <div class="analytics-item"><strong>${overdue}</strong><span>Overdue Follow-ups</span></div>
    <div class="analytics-item"><strong>${hot}</strong><span>Hot Leads</span></div>
  `;
}

function getFilteredLeads() {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedStatus = filterStatus.value;

  return leads
    .map((lead, index) => ({
      lead,
      index
    }))
    .filter(({ lead }) => {
      const matchesSearch =
        lead.businessName.toLowerCase().includes(searchTerm) ||
        (lead.contact || "").toLowerCase().includes(searchTerm) ||
        (lead.notes || "").toLowerCase().includes(searchTerm) ||
        (lead.link || "").toLowerCase().includes(searchTerm);

      const matchesStatus =
        selectedStatus === "all" || lead.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
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
    const score = getLeadScore(lead);

    div.className = isOverdue(lead.nextFollowUp)
      ? "lead-card overdue-lead"
      : "lead-card";

    div.innerHTML = `
      <div class="lead-card-top">
        <div>
          <h3>${lead.businessName}</h3>
          <span class="priority-badge">${lead.priority || "Cold"} Lead</span>
          <span class="lead-score-badge score-${score.level}" title="${score.reason}">
            ${score.label} • ${score.score}
          </span>
        </div>
        <span class="status-badge">${lead.status || "New"}</span>
      </div>

      <div class="lead-meta">
        <p><strong>Score Reason:</strong> ${score.reason}</p>
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
        <button class="email-btn" onclick="sendEmail(${index})">Email</button>
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
    showToast("Please login first.", "warning");
    return;
  }

  if (editIndex === null && !canAddMoreLeads()) {
    return;
  }

  const businessName = document.getElementById("businessName").value.trim();
  const leadLink = document.getElementById("leadLink").value.trim();
  const contactInfo = document.getElementById("contactInfo").value.trim();
  const priority = document.getElementById("priority").value;
  const notes = document.getElementById("notes").value.trim();

  const wasEditing = editIndex !== null;

  const leadData = {
    userId: currentUser.id,
    businessName: businessName || "Untitled Lead",
    link: leadLink || "",
    contact: contactInfo || "",
    priority: priority || "Cold",
    notes: notes || "",
    status: "New",
    createdAt: new Date().toLocaleString(),
    lastContacted: "",
    nextFollowUp: ""
  };

  try {
    let response;

    if (wasEditing) {
      const leadId = leads[editIndex].id;

      response = await fetch(`${API_URL}/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
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
      response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(leadData)
      });
    }

    const data = await readJsonResponse(response);

    if (!response.ok) {
      console.error("Save lead server error:", data);
      alert(data.error || "Could not save lead. Check Render logs.");
      showToast(data.error || "Could not save lead.", "error");
      return;
    }

    leadForm.reset();

    await fetchLeads();

    showPage("leadsPage");
    showToast(wasEditing ? "Lead updated successfully." : "Lead saved successfully.", "success");
  } catch (error) {
    console.error("Save lead connection error:", error);
    alert("Could not connect to backend. Check Console and Render logs.");
    showToast("Could not connect to backend.", "error");
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
  showToast("Lead loaded for editing.", "info");
}

async function deleteLead(index) {
  const confirmDelete = confirm("Delete this lead?");
  if (!confirmDelete) return;

  try {
    const response = await fetch(`${API_URL}/${leads[index].id}`, {
      method: "DELETE"
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      console.error("Delete lead server error:", data);
      showToast(data.error || "Could not delete lead.", "error");
      return;
    }

    await fetchLeads();
    showToast("Lead deleted successfully.", "success");
  } catch (error) {
    console.error("Delete lead connection error:", error);
    showToast("Could not connect to backend.", "error");
  }
}

async function updateStatus(index, newStatus) {
  const lead = leads[index];

  try {
    const response = await fetch(`${API_URL}/${lead.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...lead,
        userId: currentUser.id,
        status: newStatus
      })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      console.error("Update status server error:", data);
      showToast(data.error || "Could not update status.", "error");
      return;
    }

    await fetchLeads();
    showToast(`Lead marked as ${newStatus}.`, "success");
  } catch (error) {
    console.error("Update status connection error:", error);
    showToast("Could not connect to backend.", "error");
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
    userId: currentUser.id,
    nextFollowUp: date,
    lastContacted: new Date().toISOString().split("T")[0]
  });
}

async function updateLead(leadId, payload) {
  try {
    const response = await fetch(`${API_URL}/${leadId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...payload,
        userId: currentUser.id
      })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      console.error("Update lead server error:", data);
      showToast(data.error || "Could not update lead.", "error");
      return;
    }

    await fetchLeads();
    showToast("Lead updated successfully.", "success");
  } catch (error) {
    console.error("Update lead connection error:", error);
    showToast("Could not connect to backend.", "error");
  }
}

function generateMessage(lead) {
  const service = serviceInput.value.trim() || "my services";
  const notes = lead.notes ? lead.notes.trim() : "";
  const style = messageStyle.value;

  const personalLine = notes
    ? `I noticed this about your business: ${notes}`
    : "I wanted to reach out because your business looks like it could benefit from extra support.";

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

function typeText(element, text, speed = 18) {
  if (!element) return;

  element.value = "";
  let index = 0;

  function typeCharacter() {
    if (index < text.length) {
      element.value += text.charAt(index);
      index++;
      setTimeout(typeCharacter, speed);
    }
  }

  typeCharacter();
}

async function handleGenerate(index) {
  if (!requireFeature("ai_outreach")) return;

  const lead = leads[index];

  showPage("outreachPage");
  messageOutput.value = "Generating outreach message...";
  showToast("Generating outreach message...", "info");

  try {
    const response = await fetch(`${BASE_URL}/api/generate-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        businessName: lead.businessName,
        service: serviceInput.value.trim() || "my services",
        notes: lead.notes || "",
        style: messageStyle.value,
        userName: currentUser ? currentUser.name : "AutoClient User",
        userId: currentUser ? currentUser.id : null,
        leadId: lead.id
      })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data.error || "Message failed");
    }

    typeText(messageOutput, data.message);
    await fetchActivities();

    showToast("AI outreach message generated.", "success");
  } catch (error) {
    console.error("Message error:", error);
    typeText(messageOutput, generateMessage(lead));
    showToast("Used fallback outreach generator.", "warning");
  }
}

async function sendEmail(index) {
  if (!requireFeature("email_integration")) return;

  const lead = leads[index];

  if (!currentUser) {
    showToast("Please login first.", "warning");
    return;
  }

  const defaultEmail = lead.contact && lead.contact.includes("@") ? lead.contact : "";
  const email = prompt("Enter recipient email address:", defaultEmail);

  if (!email) return;

  if (!email.includes("@")) {
    showToast("Please enter a valid email address.", "warning");
    return;
  }

  const subject = prompt(
    "Email subject:",
    `Quick message for ${lead.businessName}`
  );

  if (!subject) return;

  const message = generateMessage(lead);

  try {
    showToast("Sending email...", "info");

    const response = await fetch(SEND_EMAIL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUser.id,
        leadId: lead.id,
        businessName: lead.businessName,
        to: email.trim(),
        subject: subject.trim(),
        message
      })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      console.error("Email send error:", data);
      alert(data.error || "Email failed. Check Render logs.");
      showToast(data.error || "Email failed to send.", "error");
      return;
    }

    await fetchActivities();

    showToast("Email sent successfully.", "success");
  } catch (error) {
    console.error("Send email connection error:", error);
    alert("Could not connect to email backend. Check Render logs.");
    showToast("Could not connect to email backend.", "error");
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

  logActivity(
    lead.id,
    "WhatsApp Outreach Opened",
    `WhatsApp outreach opened for ${lead.businessName}.`
  );

  showToast("WhatsApp outreach opened.", "success");
}

function sendLinkedIn(index) {
  const lead = leads[index];
  const message = generateMessage(lead);

  navigator.clipboard.writeText(message);

  const searchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(lead.businessName)}`;
  window.open(searchUrl, "_blank");

  logActivity(
    lead.id,
    "LinkedIn Outreach Opened",
    `LinkedIn search opened and message copied for ${lead.businessName}.`
  );

  showToast("Message copied. Paste it into LinkedIn chat.", "success");
}

copyBtn.addEventListener("click", async function () {
  if (!messageOutput.value.trim()) {
    copyBtn.textContent = "No message";
    showToast("No outreach message to copy.", "warning");

    setTimeout(() => {
      copyBtn.textContent = "Copy Message";
    }, 1500);

    return;
  }

  try {
    await navigator.clipboard.writeText(messageOutput.value);
  } catch (error) {
    messageOutput.select();
    document.execCommand("copy");
  }

  copyBtn.textContent = "Copied!";

  await logActivity(
    null,
    "Message Copied",
    "An outreach message was copied to clipboard."
  );

  showToast("Message copied successfully.", "success");

  setTimeout(() => {
    copyBtn.textContent = "Copy Message";
  }, 1500);
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
        showToast("Login first.", "warning");
        return;
      }

      if (!canAddMoreLeads()) {
        return;
      }

      const newLead = {
        userId: currentUser.id,
        businessName: idea.businessName || "Untitled Lead",
        link: googleSearchUrl,
        contact: "",
        priority: "Warm",
        notes: idea.notes || "",
        status: "New",
        createdAt: new Date().toLocaleString(),
        lastContacted: "",
        nextFollowUp: ""
      };

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(newLead)
        });

        const data = await readJsonResponse(response);

        if (!response.ok) {
          console.error("Add idea server error:", data);
          alert(data.error || "Could not add lead idea. Check Render logs.");
          showToast(data.error || "Could not add lead.", "error");
          return;
        }

        await fetchLeads();
        showToast("Lead idea added successfully.", "success");
      } catch (error) {
        console.error("Add idea connection error:", error);
        alert("Could not connect to backend while adding lead idea.");
        showToast("Could not connect to backend.", "error");
      }
    });

    leadIdeas.appendChild(div);
  });
}

findLeadsBtn.addEventListener("click", async function () {
  const industry = leadIndustry.value.trim();
  const location = leadLocation.value.trim();

  if (!industry || !location) {
    showToast("Enter both industry and location.", "warning");
    return;
  }

  leadIdeas.innerHTML = "Finding leads...";
  showToast("Finding lead ideas...", "info");

  try {
    const response = await fetch(`${BASE_URL}/api/find-leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        industry,
        location,
        userId: currentUser ? currentUser.id : null
      })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data.error || "Failed");
    }

    renderLeadIdeas(data);
    await fetchActivities();

    showToast("Lead ideas generated.", "success");
  } catch (error) {
    console.error("Lead finder error:", error);
    leadIdeas.innerHTML = "<p>Could not generate leads.</p>";
    showToast("Could not generate leads.", "error");
  }
});

function exportToCSV() {
  if (!requireFeature("csv_export")) return;

  if (leads.length === 0) {
    showToast("No leads to export.", "warning");
    return;
  }

  const headers = [
    "Business Name",
    "Link",
    "Contact",
    "Priority",
    "Status",
    "Notes",
    "Created"
  ];

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

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "autoclient_leads.csv";
  link.click();

  URL.revokeObjectURL(url);

  logActivity(
    null,
    "CSV Exported",
    "Lead data was exported as a CSV file."
  );

  showToast("CSV exported successfully.", "success");
}

searchInput.addEventListener("input", renderLeads);
filterStatus.addEventListener("change", renderLeads);
exportBtn.addEventListener("click", exportToCSV);

async function loadAdminDashboard() {
  if (!isCurrentAdmin()) {
    showToast("Admin access only.", "warning");
    showPage("dashboardPage");
    return;
  }

  try {
    const statsRes = await fetch(`${BASE_URL}/api/admin/stats?userId=${currentUser.id}`);
    const usersRes = await fetch(`${BASE_URL}/api/admin/users?userId=${currentUser.id}`);
    const leadsRes = await fetch(`${BASE_URL}/api/admin/leads?userId=${currentUser.id}`);

    const stats = await readJsonResponse(statsRes);
    const users = await readJsonResponse(usersRes);
    const allLeads = await readJsonResponse(leadsRes);

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
        <span>Plan: ${(user.plan || "free").toUpperCase()} • ${user.subscription_status || user.subscriptionstatus || "inactive"}</span>
        <span>Joined: ${user.createdAt || user.createdat || "N/A"}</span>
      `;

      adminUsersList.appendChild(div);
    });

    adminLeadsList.innerHTML = allLeads.length
      ? ""
      : `<div class="table-row"><strong>No leads found</strong></div>`;

    allLeads.slice(0, 30).map(normalizeLead).forEach(lead => {
      const div = document.createElement("div");
      div.className = "table-row";

      div.innerHTML = `
        <strong>${lead.businessName}</strong>
        <span>${lead.status || "New"} • ${lead.priority || "Cold"}</span>
        <span>Owner: ${lead.ownerName || "Unknown"} — ${lead.ownerEmail || "N/A"}</span>
      `;

      adminLeadsList.appendChild(div);
    });

    showToast("Admin dashboard refreshed.", "success");
  } catch (error) {
    console.error("Admin dashboard error:", error);
    showToast("Could not load admin dashboard.", "error");
  }
}

if (refreshAdminBtn) {
  refreshAdminBtn.addEventListener("click", loadAdminDashboard);
}

function renderAnalyticsCharts() {
  if (!currentPlan.features.analytics) return;

  const leadCanvas = document.getElementById("leadStatusChart");
  const outreachCanvas = document.getElementById("outreachChart");

  if (!leadCanvas || !outreachCanvas || typeof Chart === "undefined") return;

  const leadCounts = {
    New: leads.filter(lead => lead.status === "New").length,
    Contacted: leads.filter(lead => lead.status === "Contacted").length,
    Interested: leads.filter(lead => lead.status === "Interested").length,
    Closed: leads.filter(lead => lead.status === "Closed").length,
    Rejected: leads.filter(lead => lead.status === "Rejected").length
  };

  if (leadStatusChart) leadStatusChart.destroy();
  if (outreachChart) outreachChart.destroy();

  leadStatusChart = new Chart(leadCanvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(leadCounts),
      datasets: [{
        data: Object.values(leadCounts),
        backgroundColor: [
          "#2563eb",
          "#06b6d4",
          "#f59e0b",
          "#22c55e",
          "#ef4444"
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });

  outreachChart = new Chart(outreachCanvas, {
    type: "bar",
    data: {
      labels: [
        "Total Leads",
        "Contacted",
        "Interested",
        "Closed",
        "Overdue"
      ],
      datasets: [{
        label: "Lead Activity",
        data: [
          leads.length,
          leadCounts.Contacted,
          leadCounts.Interested,
          leadCounts.Closed,
          leads.filter(lead => isOverdue(lead.nextFollowUp)).length
        ],
        backgroundColor: "#2563eb",
        borderRadius: 12
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem("autoclient_theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    if (themeToggle) themeToggle.textContent = "☀️ Light";
  } else {
    document.body.classList.remove("dark-mode");
    if (themeToggle) themeToggle.textContent = "🌙 Dark";
  }
}

if (themeToggle) {
  themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");

    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("autoclient_theme", isDark ? "dark" : "light");

    themeToggle.textContent = isDark ? "☀️ Light" : "🌙 Dark";

    renderAnalyticsCharts();
  });
}

function renderKanbanBoard() {
  const columns = {
    New: document.getElementById("kanban-new"),
    Contacted: document.getElementById("kanban-contacted"),
    Interested: document.getElementById("kanban-interested"),
    Closed: document.getElementById("kanban-closed")
  };

  Object.values(columns).forEach(column => {
    if (column) column.innerHTML = "";
  });

  if (!currentPlan.features.kanban) {
    Object.values(columns).forEach(column => {
      if (column) {
        column.innerHTML = `
          <div class="kanban-card">
            <h4>🔒 Kanban Locked</h4>
            <p>Upgrade to Pro or Agency to use the CRM pipeline.</p>
          </div>
        `;
      }
    });
    return;
  }

  leads.forEach((lead, index) => {
    const status = ["New", "Contacted", "Interested", "Closed"].includes(lead.status)
      ? lead.status
      : "New";

    const score = getLeadScore(lead);

    const card = document.createElement("div");
    card.className = "kanban-card";
    card.draggable = true;
    card.dataset.index = index;

    card.innerHTML = `
      <h4>${lead.businessName}</h4>
      <p>${lead.contact || "No contact info"}</p>
      <span class="kanban-priority">${lead.priority || "Cold"} Lead</span>
      <span class="lead-score-badge score-${score.level}">${score.label}</span>
    `;

    card.addEventListener("dragstart", function () {
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", function () {
      card.classList.remove("dragging");
    });

    if (columns[status]) {
      columns[status].appendChild(card);
    }
  });

  document.querySelectorAll(".kanban-dropzone").forEach(zone => {
    zone.addEventListener("dragover", e => {
      e.preventDefault();
    });

    zone.addEventListener("drop", async function () {
      const draggedCard = document.querySelector(".dragging");
      if (!draggedCard) return;

      const leadIndex = draggedCard.dataset.index;
      const lead = leads[leadIndex];

      let newStatus = "New";

      if (zone.id === "kanban-contacted") newStatus = "Contacted";
      if (zone.id === "kanban-interested") newStatus = "Interested";
      if (zone.id === "kanban-closed") newStatus = "Closed";

      await updateLead(lead.id, {
        ...lead,
        userId: currentUser.id,
        status: newStatus
      });

      showToast(`Lead moved to ${newStatus}.`, "success");
    });
  });
}

const upgradeProBtn = document.getElementById("upgradeProBtn");
const upgradeAgencyBtn = document.getElementById("upgradeAgencyBtn");
const manageBillingBtn = document.getElementById("manageBillingBtn");

if (upgradeProBtn) {
  upgradeProBtn.addEventListener("click", () => startCheckout("pro"));
}

if (upgradeAgencyBtn) {
  upgradeAgencyBtn.addEventListener("click", () => startCheckout("agency"));
}

if (manageBillingBtn) {
  manageBillingBtn.addEventListener("click", openBillingPortal);
}

injectSmartCRMStyles();
applySavedTheme();
checkAuth();
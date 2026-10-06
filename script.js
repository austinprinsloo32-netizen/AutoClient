const BASE_URL =
  window.location.hostname.includes("github.io")
    ? "https://autoclient-v2.onrender.com"
    : "";

const API_URL = `${BASE_URL}/api/leads`;
const ACTIVITIES_URL = `${BASE_URL}/api/activities`;
const ACTIVITY_LOG_URL = `${BASE_URL}/api/activities/log`;
const SEND_EMAIL_URL = `${BASE_URL}/api/send-email`;
const MY_PLAN_URL = `${BASE_URL}/api/my-plan`;
const CHECKOUT_URL = `${BASE_URL}/api/create-paystack-checkout`;
const BILLING_PORTAL_URL = `${BASE_URL}/api/create-paystack-manage-link`;

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
if (copyBtn && !messageOutput?.value.trim()) {
  copyBtn.disabled = true;
}
const messageStyle = document.getElementById("messageStyle");

const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const exportBtn = document.getElementById("exportBtn");

const totalLeads = document.getElementById("totalLeads");
const newLeads = document.getElementById("newLeads");
const contactedLeads = document.getElementById("contactedLeads");
const qualifiedLeads = document.getElementById("qualifiedLeads");
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
const adminQualifiedLeads = document.getElementById("adminQualifiedLeads");
const adminClosedLeads = document.getElementById("adminClosedLeads");
const adminUsersList = document.getElementById("adminUsersList");
const adminLeadsList = document.getElementById("adminLeadsList");

const settingsUserName = document.getElementById("settingsUserName");
const settingsUserEmail = document.getElementById("settingsUserEmail");
const settingsUserRole = document.getElementById("settingsUserRole");
// Business Profile
const businessProfileForm =
  document.getElementById("businessProfileForm");

const businessNameInput =
  document.getElementById("profileBusinessName");

const businessDescriptionInput =
  document.getElementById("profileBusinessDescription");

const businessServicesInput =
  document.getElementById("profileBusinessServices");

const businessWebsiteInput =
  document.getElementById("profileBusinessWebsite");

const businessToneInput =
  document.getElementById("profileBusinessTone");

const saveBusinessProfileBtn =
  document.getElementById("saveBusinessProfileBtn");

const businessProfileStatus =
  document.getElementById("businessProfileStatus");

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

   .locked-feature-card {
  border: 1px dashed #cbd5e1;
  background: linear-gradient(135deg, #f8fafc, #eef2ff);
  border-radius: 22px;
  padding: 28px;
  text-align: center;
  display: grid;
  gap: 14px;
  place-items: center;
  margin-top: 12px;
}

.locked-feature-icon {
  font-size: 40px;
}

.locked-feature-card h3 {
  color: var(--navy);
  font-size: 22px;
  margin: 0;
}

.locked-feature-card p {
  color: var(--muted);
  max-width: 460px;
  line-height: 1.6;
}

body.dark-mode .locked-feature-card {
  background: #0f172a;
  border-color: #334155;
}

body.dark-mode .locked-feature-card h3 {
  color: #f8fafc;
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
  if (!lead) {
    return null;
  }

  return {
    id: lead.id,

    userId:
      lead.userId ??
      lead.userid ??
      null,

    businessName:
      lead.businessName ??
      lead.businessname ??
      "",

    contactPerson:
      lead.contactPerson ??
      lead.contactperson ??
      "",

    link:
      lead.link ??
      "",

    /*
     * Contact Channels
     */

    email:
      lead.email ??
      "",

    phone:
      lead.phone ??
      "",

    linkedin:
      lead.linkedin ??
      "",

    /*
     * Legacy contact field.
     * Kept for backwards compatibility with older leads.
     */

    contact:
      lead.contact ??
      "",

    priority:
      lead.priority ??
      "Cold",

    notes:
      lead.notes ??
      "",

    status:
      lead.status ??
      "New",

    createdAt:
      lead.createdAt ??
      lead.createdat ??
      "",

    lastContacted:
      lead.lastContacted ??
      lead.lastcontacted ??
      "",

    nextFollowUp:
      lead.nextFollowUp ??
      lead.nextfollowup ??
      "",

    ownerName:
      lead.ownerName ??
      lead.ownername ??
      "",

    ownerEmail:
      lead.ownerEmail ??
      lead.owneremail ??
      "",

    /*
     * V3 Lead Intelligence
     */

    aiSummary:
      lead.aiSummary ??
      lead.aisummary ??
      "",

    aiOpportunity:
      lead.aiOpportunity ??
      lead.aiopportunity ??
      "",

    aiRecommendedApproach:
      lead.aiRecommendedApproach ??
      lead.airecommendedapproach ??
      "",

    aiBestChannel:
      lead.aiBestChannel ??
      lead.aibestchannel ??
      "",

    aiNextAction:
      lead.aiNextAction ??
      lead.ainextaction ??
      "",

    aiConfidence:
      lead.aiConfidence ??
      lead.aiconfidence ??
      "",

    aiScore:
      lead.aiScore ??
      lead.aiscore ??
      null,

    aiLastAnalyzed:
      lead.aiLastAnalyzed ??
      lead.ailastanalyzed ??
      "",

    /*
     * Follow-Up Intelligence
     */

    followUpIntelligence:
      lead.followUpIntelligence ??
      lead.followupintelligence ??
      null
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

async function loadBusinessProfile() {
  if (!currentUser) return;

  try {
    const response = await fetch(
      `${BASE_URL}/api/business-profile`
    );

    const data = await readJsonResponse(response);

    if (!response.ok) {
      console.error(
        "Business profile fetch error:",
        data
      );

      showToast(
        data.error || "Could not load Business Profile.",
        "error"
      );

      return;
    }

    const profile = data.businessProfile || {};

    if (businessNameInput) {
      businessNameInput.value =
        profile.businessName || "";
    }

    if (businessDescriptionInput) {
      businessDescriptionInput.value =
        profile.description || "";
    }

    if (businessServicesInput) {
      businessServicesInput.value =
        profile.services || "";
    }

    if (businessWebsiteInput) {
      businessWebsiteInput.value =
        profile.website || "";
    }

    if (businessToneInput) {
      businessToneInput.value =
        profile.tone || "professional";
    }
  } catch (error) {
    console.error(
      "Could not load Business Profile:",
      error
    );

    showToast(
      "Could not load Business Profile.",
      "error"
    );
  }
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
  const planBadge =
    document.getElementById("planBadge");

  const settingsUserPlan =
    document.getElementById("settingsUserPlan");

  const subscriptionStatus =
    document.getElementById("subscriptionStatus");

  const planLimits =
    document.getElementById("planLimits");

  const topPlanStatus =
    document.getElementById("topPlanStatus");

  const freePlanBtn =
    document.getElementById("freePlanBtn");

  const upgradeProBtn =
    document.getElementById("upgradeProBtn");

  const status =
    (
      currentPlan.subscriptionStatus ||
      "inactive"
    ).toLowerCase();

  const plan =
    (
      currentPlan.plan ||
      "free"
    ).toLowerCase();

  const planName =
    currentPlan.planName ||
    plan.toUpperCase();

  // -----------------------------------------
  // PLAN BADGE
  // -----------------------------------------

  if (planBadge) {
    planBadge.textContent =
      `${planName} PLAN`;

    planBadge.className =
      `plan-badge ${plan}`;
  }

  // -----------------------------------------
  // SETTINGS PLAN NAME
  // -----------------------------------------

  if (settingsUserPlan) {
    settingsUserPlan.textContent =
      `${planName} PLAN`;
  }

  // -----------------------------------------
  // TOP ACCOUNT STATUS
  // -----------------------------------------

  if (topPlanStatus) {
    if (status === "beta") {
      topPlanStatus.textContent = "BETA";
    }

    else if (status === "active") {
      topPlanStatus.textContent = "LIVE";
    }

    else if (status === "non_renewing") {
      topPlanStatus.textContent = "NON-RENEWING";
    }

    else if (status === "cancelled") {
      topPlanStatus.textContent = "CANCELLED";
    }

    else if (status === "past_due") {
      topPlanStatus.textContent = "PAST DUE";
    }

    else if (plan === "pro") {
      topPlanStatus.textContent = "PRO";
    }

    else {
      topPlanStatus.textContent = "FREE";
    }
  }

  // -----------------------------------------
  // SETTINGS SUBSCRIPTION STATUS
  // -----------------------------------------

  if (subscriptionStatus) {
    subscriptionStatus.className =
      "subscription-status";

    if (status === "active") {
      subscriptionStatus.textContent =
        "ACTIVE";

      subscriptionStatus.style.color =
        "#22c55e";
    }

    else if (status === "non_renewing") {
      subscriptionStatus.textContent =
        "NON-RENEWING";

      subscriptionStatus.style.color =
        "#f59e0b";
    }

    else if (status === "cancelled") {
      subscriptionStatus.textContent =
        "CANCELLED";

      subscriptionStatus.style.color =
        "#ef4444";
    }

    else if (status === "past_due") {
      subscriptionStatus.textContent =
        "PAST DUE";

      subscriptionStatus.style.color =
        "#f59e0b";
    }

    else if (status === "beta") {
      subscriptionStatus.textContent =
        "BETA";

      subscriptionStatus.style.color =
        "#38bdf8";
    }

    else if (plan === "pro") {
      subscriptionStatus.textContent =
        "PRO";

      subscriptionStatus.style.color =
        "#22c55e";
    }

    else {
      subscriptionStatus.textContent =
        "FREE PLAN";

      subscriptionStatus.style.color =
        "#94a3b8";
    }
  }

  // -----------------------------------------
  // PLAN LIMIT
  // -----------------------------------------

  if (planLimits) {
    const maxLeads =
      currentPlan.features?.max_leads ?? 10;

    planLimits.textContent =
      `Lead limit: ${maxLeads}`;
  }

  // -----------------------------------------
  // PRICING CARDS
  // -----------------------------------------

  if (plan === "pro") {
    if (freePlanBtn) {
      freePlanBtn.textContent =
        "Starter plan";

      freePlanBtn.disabled = true;
    }

    if (upgradeProBtn) {
      upgradeProBtn.textContent =
        status === "beta"
          ? "Current Pro access"
          : "Current Pro plan";

      upgradeProBtn.disabled = true;
    }
  }

  else {
    if (freePlanBtn) {
      freePlanBtn.textContent =
        "Current Starter plan";

      freePlanBtn.disabled = true;
    }

    if (upgradeProBtn) {
      upgradeProBtn.textContent =
        "Upgrade to Pro";

      upgradeProBtn.disabled = false;
    }
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

async function startCheckout(plan = "pro") {
  if (!currentUser) {
    showToast("Please login first.", "warning");
    return;
  }

  try {
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
      showToast(
        data.error || "Could not start Paystack checkout.",
        "error"
      );
      return;
    }

    window.location.href = data.url;
  } catch (error) {
    console.error("Paystack checkout error:", error);

    showToast(
      "Could not connect to Paystack checkout.",
      "error"
    );
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
      }
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      showToast(
        data.error || "Subscription management unavailable.",
        "warning"
      );
      return;
    }

    window.location.href = data.url;
  } catch (error) {
    console.error(
      "Paystack subscription management error:",
      error
    );

    showToast(
      "Could not open subscription management.",
      "error"
    );
  }
}

function handleBillingRedirectNotice() {
  const params = new URLSearchParams(window.location.search);

  if (params.get("billing") === "success") {
    showToast(
      "Payment successful. Your Pro subscription is being confirmed.",
      "success"
    );

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
  }

  if (params.get("billing") === "cancelled") {
    showToast(
      "Checkout cancelled. No payment was made.",
      "info"
    );

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );
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

if (["Qualified", "Interested"].includes(status)) {
  score += 40;
  reasons.push("Qualified");
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
  const hotLeads = leads.filter(
    lead => getLeadScore(lead).level === "hot"
  );

  const warmLeads = leads.filter(
    lead => getLeadScore(lead).level === "warm"
  );

  const coldLeads = leads.filter(
    lead => getLeadScore(lead).level === "cold"
  );

  const overdueFollowUps = leads.filter(
    lead => isOverdue(lead.nextFollowUp)
  );

  const todayFollowUps = leads.filter(
    lead => isToday(lead.nextFollowUp)
  );

  const activeLeads = leads.filter(lead =>
    ["Contacted", "Follow-up", "Qualified"].includes(lead.status)
  );

  const closedLeads = leads.filter(
    lead => lead.status === "Closed"
  );

  const conversionRate = leads.length
    ? Math.round((closedLeads.length / leads.length) * 100)
    : 0;

  return {
    hotLeads,
    warmLeads,
    coldLeads,
    overdueFollowUps,
    todayFollowUps,
    activeLeads,
    closedLeads,
    conversionRate
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
      <span>📈 Conversion Rate</span>
      <strong>${metrics.conversionRate}%</strong>
      <p>
        ${metrics.closedLeads.length} of ${leads.length}
        ${leads.length === 1 ? "lead" : "leads"} closed.
      </p>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function renderOutreachCenter() {
  const outreachPage = document.getElementById("outreachPage");
  if (!outreachPage) return;

  const readyCount = document.getElementById("outreachReadyCount");
  const dueTodayCount = document.getElementById("outreachDueTodayCount");
  const overdueCount = document.getElementById("outreachOverdueCount");
  const contactedCount = document.getElementById("outreachContactedCount");

  const attentionList = document.getElementById("outreachAttentionList");
  const readyList = document.getElementById("outreachReadyList");
  const recentActivity = document.getElementById("outreachRecentActivity");

  if (
    !readyCount ||
    !dueTodayCount ||
    !overdueCount ||
    !contactedCount ||
    !attentionList ||
    !readyList ||
    !recentActivity
  ) {
    return;
  }

  const metrics = getSmartMetrics();

  const contactedLeads = leads.filter(lead =>
    ["Contacted", "Follow-up", "Qualified", "Interested", "Closed"].includes(
      lead.status
    )
  );

  const readyLeads = leads
    .filter(lead =>
      lead.status !== "Closed" &&
      getLeadScore(lead).level === "hot" &&
      !isOverdue(lead.nextFollowUp) &&
      !isToday(lead.nextFollowUp)
    )
    .slice(0, 5);

  const attentionLeads = [
    ...metrics.overdueFollowUps,
    ...metrics.todayFollowUps.filter(
      lead =>
        !metrics.overdueFollowUps.some(
          item => item.id === lead.id
        )
    )
  ].filter(lead => lead.status !== "Closed");

  readyCount.textContent = readyLeads.length;
  dueTodayCount.textContent = metrics.todayFollowUps.length;
  overdueCount.textContent = metrics.overdueFollowUps.length;
  contactedCount.textContent = contactedLeads.length;

  const getLeadIndex = lead =>
    leads.findIndex(item => item.id === lead.id);

  const getDisplayStatus = lead => {
    if (lead.status === "Interested") {
      return "Qualified";
    }

    return lead.status || "New";
  };

  const renderLeadCard = (lead, type) => {
    const index = getLeadIndex(lead);

    if (index === -1) return "";

    const score = getLeadScore(lead);

    const businessName = escapeHtml(
      lead.business || lead.businessName || "Unnamed lead"
    );

    const displayStatus = escapeHtml(
      getDisplayStatus(lead)
    );

    let badgeText = "Ready";
    let badgeClass = "ready";

    if (type === "overdue") {
      badgeText = "Overdue";
      badgeClass = "overdue";
    } else if (type === "today") {
      badgeText = "Due today";
      badgeClass = "today";
    }

    return `
      <div class="outreach-lead-item">
        <div class="outreach-lead-main">

          <div class="outreach-lead-avatar">
            ${businessName.charAt(0).toUpperCase()}
          </div>

          <div class="outreach-lead-copy">
            <strong>${businessName}</strong>

            <span>
              ${displayStatus} ·
              ${escapeHtml(score.level.toUpperCase())} lead
            </span>
          </div>

        </div>

        <div class="outreach-lead-actions">

          <span class="outreach-status-badge ${badgeClass}">
            ${badgeText}
          </span>

          <button
            type="button"
            class="secondary-btn outreach-view-btn"
            data-lead-index="${index}"
          >
            View
          </button>

          <button
            type="button"
            class="primary-btn outreach-ai-btn"
            data-lead-index="${index}"
          >
            AI Outreach
          </button>

        </div>
      </div>
    `;
  };

  if (attentionLeads.length) {
    attentionList.innerHTML = attentionLeads
      .slice(0, 6)
      .map(lead => {
        const type = isOverdue(lead.nextFollowUp)
          ? "overdue"
          : "today";

        return renderLeadCard(lead, type);
      })
      .join("");
  } else {
    attentionList.innerHTML = `
      <div class="outreach-empty-state">
        <strong>You're all caught up.</strong>
        <p>No follow-ups are due or overdue right now.</p>
      </div>
    `;
  }

  if (readyLeads.length) {
    readyList.innerHTML = readyLeads
      .map(lead => renderLeadCard(lead, "ready"))
      .join("");
  } else {
    readyList.innerHTML = `
      <div class="outreach-empty-state">
        <strong>No priority leads waiting.</strong>
        <p>Hot leads ready for outreach will appear here.</p>
      </div>
    `;
  }

  const outreachActivities = activities
    .filter(activity => {
      const type = String(
        activity.type || activity.action || ""
      ).toLowerCase();

      return (
        type.includes("email") ||
        type.includes("outreach") ||
        type.includes("contact") ||
        type.includes("message")
      );
    })
    .slice(0, 6);

  if (outreachActivities.length) {
    recentActivity.innerHTML = outreachActivities
      .map(activity => {
        const title = escapeHtml(
          activity.type ||
          activity.action ||
          "Outreach activity"
        );

        const detail = escapeHtml(
          activity.details ||
          activity.description ||
          activity.message ||
          ""
        );

        const timestamp = escapeHtml(
          activity.createdAt ||
          activity.created_at ||
          activity.timestamp ||
          ""
        );

        return `
          <div class="outreach-activity-item">

            <div>
              <strong>${title}</strong>
              ${detail ? `<p>${detail}</p>` : ""}
            </div>

            ${
              timestamp
                ? `<span>${timestamp}</span>`
                : ""
            }

          </div>
        `;
      })
      .join("");
  } else {
    recentActivity.innerHTML = `
      <div class="outreach-empty-state">
        <strong>No outreach activity yet.</strong>
        <p>Your latest client-contact actions will appear here.</p>
      </div>
    `;
  }

  outreachPage
    .querySelectorAll(".outreach-view-btn")
    .forEach(button => {
      button.addEventListener("click", function () {
        const index = Number(this.dataset.leadIndex);

        if (!Number.isInteger(index) || !leads[index]) {
          showToast("Lead not found.", "error");
          return;
        }

        openLeadDetails(index);
      });
    });

  outreachPage
    .querySelectorAll(".outreach-ai-btn")
    .forEach(button => {
      button.addEventListener("click", function () {
        const index = Number(this.dataset.leadIndex);

        if (!Number.isInteger(index) || !leads[index]) {
          showToast("Lead not found.", "error");
          return;
        }

        handleGenerate(index);
      });
    });
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
      message: "Move more leads from New into Contacted, Follow-up, or Qualified."
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
      <div class="locked-feature-card">
        <div class="locked-feature-icon">📈</div>

        <h3>No CRM Activity Yet</h3>

        <p>
          Your outreach actions, follow-ups, emails,
          and CRM interactions will appear here automatically.
        </p>
      </div>
    `;
    return;
  }

  activities.slice(0, 8).forEach(activity => {
    const div = document.createElement("div");
    div.className = "activity-item";

    const action = document.createElement("strong");
    action.textContent = activity.action || "Activity";

    const details = document.createElement("span");
    details.textContent = activity.details || "No details available.";

    const time = document.createElement("div");
    time.className = "activity-time";
    time.textContent = activity.createdAt || "Just now";

    div.appendChild(action);
    div.appendChild(details);
    div.appendChild(time);

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

  window.scrollTo({
  top: 0,
  left: 0,
  behavior: "instant"
  });
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
  localStorage.setItem(
    "autoclient_user",
    JSON.stringify(currentUser)
  );

  userDisplay.textContent = currentUser
    ? `${currentUser.name} ${isCurrentAdmin() ? "• Admin" : ""}`
    : "Logged in";

  adminOnlyLinks.forEach(link => {
    link.style.display = isCurrentAdmin()
      ? "flex"
      : "none";
  });

  settingsUserName.textContent = currentUser.name;
  settingsUserEmail.textContent = currentUser.email;
  settingsUserRole.textContent = isCurrentAdmin()
    ? "Admin"
    : "User";

  if (!isCurrentAdmin()) {
    showPage("dashboardPage");
  }

  await loadUserPlan();
  await loadBusinessProfile();
  await fetchLeads();

  handleBillingRedirectNotice();
}

function checkAuth() {
  currentUser ? showApp() : showAuth();
}

if (businessProfileForm) {
  businessProfileForm.addEventListener(
    "submit",
    async function (e) {
      e.preventDefault();

      if (!currentUser) {
        showToast(
          "You must be logged in to update your Business Profile.",
          "error"
        );
        return;
      }

      const profileData = {
        businessName:
          businessNameInput?.value.trim() || "",

        description:
          businessDescriptionInput?.value.trim() || "",

        services:
          businessServicesInput?.value.trim() || "",

        website:
          businessWebsiteInput?.value.trim() || "",

        tone:
          businessToneInput?.value || "professional"
      };

      try {
        const response = await fetch(
          `${BASE_URL}/api/business-profile`,
          {
            method: "PUT",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify(profileData)
          }
        );

        const data = await readJsonResponse(response);

        if (!response.ok) {
          showToast(
            data.error ||
              "Could not save Business Profile.",
            "error"
          );
          return;
        }

        showToast(
          data.message ||
            "Business Profile saved successfully.",
          "success"
        );

        await loadBusinessProfile();
      } catch (error) {
        console.error(
          "Business Profile save error:",
          error
        );

        showToast(
          "Could not save Business Profile.",
          "error"
        );
      }
    }
  );
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

logoutBtn.addEventListener("click", async function () {
  try {
    const response = await fetch(`${BASE_URL}/api/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      showToast(
        data.error || "Could not log out.",
        "error"
      );
      return;
    }

    currentUser = null;
    leads = [];
    activities = [];

    localStorage.removeItem("autoclient_user");

    renderLeads();
    renderRecentActivity();

    showAuth();
    showPage("dashboardPage");

    showToast(
      "Logged out successfully.",
      "info"
    );

  } catch (error) {
    console.error("Logout error:", error);

    showToast(
      "Could not log out. Please try again.",
      "error"
    );
  }
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
  renderOutreachCenter();
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
  animateCounter(
  qualifiedLeads,
  leads.filter(lead => ["Qualified", "Interested"].includes(lead.status)).length
  );
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
      <div class="locked-feature-card">
        <div class="locked-feature-icon">📂</div>

        <h3>No Leads Yet</h3>

        <p>
          Your newest leads will appear here once you start
          building your CRM pipeline.
        </p>
      </div>
    `;
    return;
  }

  recent.forEach(lead => {
    const score = getLeadScore(lead);

    const div = document.createElement("div");
    div.className = "mini-item";

    const businessName = document.createElement("strong");
    businessName.textContent = lead.businessName || "Unnamed Lead";

    const summary = document.createElement("span");
    summary.textContent =
      `${score.label || ""} • ${lead.status || "New"} • ${lead.priority || "Cold"} Lead`;

    div.appendChild(businessName);
    div.appendChild(summary);

    recentLeads.appendChild(div);
  });
}

function renderAnalytics() {
  if (!analyticsGrid) return;

  if (!currentPlan.features.analytics) {
    analyticsGrid.innerHTML = `
      <div class="locked-feature-card">
        <div class="locked-feature-icon">🔒</div>

        <h3>Analytics Locked</h3>

        <p>
          Upgrade to Pro to unlock:
          conversion tracking,
          hot lead insights,
          CRM analytics,
          follow-up monitoring,
          and sales performance reporting.
        </p>

        <button
          type="button"
          class="primary-btn upgrade-pro-btn"
        >
          Upgrade to Pro
        </button>
      </div>
    `;

    const upgradeButton =
      analyticsGrid.querySelector(
        ".upgrade-pro-btn"
      );

    if (upgradeButton) {
      upgradeButton.addEventListener(
        "click",
        () => {
          showPage("settingsPage");
        }
      );
    }

    return;
  }

  const total = leads.length;

  const contacted =
    leads.filter(
      (lead) => lead.status === "Contacted"
    ).length;

const qualified =
  leads.filter(
    (lead) => ["Qualified", "Interested"].includes(lead.status)
  ).length;

  const closed =
    leads.filter(
      (lead) => lead.status === "Closed"
    ).length;

  const overdue =
    leads.filter(
      (lead) => isOverdue(lead.nextFollowUp)
    ).length;

  const hot =
    leads.filter(
      (lead) =>
        getLeadScore(lead).level === "hot"
    ).length;

  const contactedRate =
    total
      ? Math.round(
          (contacted / total) * 100
        )
      : 0;

const qualifiedRate =
  total
    ? Math.round(
        (qualified / total) * 100
      )
    : 0;

  const closeRate =
    total
      ? Math.round(
          (closed / total) * 100
        )
      : 0;

  analyticsGrid.innerHTML = `
    <div class="analytics-item">
      <strong>${contactedRate}%</strong>
      <span>Contacted Rate</span>
    </div>

    <div class="analytics-item">
      <strong>${qualifiedRate}%</strong>
      <span>Qualified Rate</span>
    </div>

    <div class="analytics-item">
      <strong>${closeRate}%</strong>
      <span>Close Rate</span>
    </div>

    <div class="analytics-item">
      <strong>${overdue}</strong>
      <span>Overdue Follow-ups</span>
    </div>

    <div class="analytics-item">
      <strong>${hot}</strong>
      <span>Hot Leads</span>
    </div>
  `;
}

function getFilteredLeads() {
  const searchTerm =
    (searchInput?.value || "")
      .trim()
      .toLowerCase();

  const selectedStatus =
    filterStatus?.value || "all";

  function getFilterStatus(status) {
    const value = String(status || "")
      .trim()
      .toLowerCase();

    if (!value || value === "new") {
      return "New";
    }

    if (value === "contacted") {
      return "Contacted";
    }

    if (
      value === "follow-up" ||
      value === "follow_up" ||
      value === "follow up" ||
      value === "replied"
    ) {
      return "Follow-up";
    }

    if (
      value === "qualified" ||
      value === "interested" ||
      value === "proposal" ||
      value === "negotiation"
    ) {
      return "Qualified";
    }

    if (value === "closed") {
      return "Closed";
    }

    return String(status || "New");
  }

  return leads
    .map((lead, index) => ({
      lead,
      index
    }))
    .filter(({ lead }) => {
      if (!lead) {
        return false;
      }

      const businessName =
        String(lead.businessName || "")
          .toLowerCase();

      const contactPerson =
        String(lead.contactPerson || "")
          .toLowerCase();

      const contact =
        String(lead.contact || "")
          .toLowerCase();

      const notes =
        String(lead.notes || "")
          .toLowerCase();

      const link =
        String(lead.link || "")
          .toLowerCase();

      const status =
        getFilterStatus(lead.status);

      const matchesSearch =
        businessName.includes(searchTerm) ||
        contactPerson.includes(searchTerm) ||
        contact.includes(searchTerm) ||
        notes.includes(searchTerm) ||
        link.includes(searchTerm);

      const matchesStatus =
        selectedStatus === "all" ||
        status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
}

const openLeadDrawerBtn =
  document.getElementById("openLeadDrawerBtn");

const closeLeadDrawerBtn =
  document.getElementById("closeLeadDrawer");

const cancelLeadDrawerBtn =
  document.getElementById("cancelLeadDrawerBtn");

const leadDrawer =
  document.getElementById("leadDrawer");

const leadDrawerOverlay =
  document.getElementById("leadDrawerOverlay");

const leadDrawerTitle =
  document.getElementById("leadDrawerTitle");

const leadDrawerSubtitle =
  document.getElementById("leadDrawerSubtitle");


function openLeadDrawer(mode = "add") {
  if (!leadDrawer || !leadDrawerOverlay) {
    return;
  }

  if (mode === "add") {
    editIndex = null;

    if (leadForm) {
      leadForm.reset();
    }

    if (leadDrawerTitle) {
      leadDrawerTitle.textContent =
        "Add Lead";
    }

    if (leadDrawerSubtitle) {
      leadDrawerSubtitle.textContent =
        "Create a new prospect in your CRM.";
    }

    const submitButton =
      leadForm?.querySelector(
        "button[type='submit']"
      );

    if (submitButton) {
      submitButton.textContent =
        "Add Lead";
    }
  }

  leadDrawerOverlay.classList.add("open");

  leadDrawerOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.style.overflow = "hidden";

  setTimeout(() => {
    document
      .getElementById("businessName")
      ?.focus();
  }, 100);
}


function closeLeadDrawer() {
  if (!leadDrawerOverlay) {
    return;
  }

  leadDrawerOverlay.classList.remove("open");

  leadDrawerOverlay.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.style.overflow = "";
}


openLeadDrawerBtn?.addEventListener(
  "click",
  () => {
    openLeadDrawer("add");
  }
);


closeLeadDrawerBtn?.addEventListener(
  "click",
  closeLeadDrawer
);


cancelLeadDrawerBtn?.addEventListener(
  "click",
  closeLeadDrawer
);


leadDrawerOverlay?.addEventListener(
  "click",
  (event) => {
    if (event.target === leadDrawerOverlay) {
      closeLeadDrawer();
    }
  }
);


document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      leadDrawerOverlay?.classList.contains("open")
    ) {
      closeLeadDrawer();
    }
  }
);


document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLeadDrawer();
  }
});

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeExternalUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  const candidate =
    /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw)
      ? raw
      : `https://${raw}`;

  try {
    const url = new URL(candidate);

    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    return url.href;
  } catch {
    return "";
  }
}

function renderLeads() {
  if (!leadList) return;

  leadList.innerHTML = "";

  const filteredLeads = getFilteredLeads();
  const leadCountSummary =
    document.getElementById("leadCountSummary");

  if (leadCountSummary) {
    const total = leads.length;
    const visible = filteredLeads.length;
    const maxLeads =
      currentPlan?.features?.max_leads || 10;

    leadCountSummary.textContent =
      visible === total
        ? `• ${total} of ${maxLeads} leads used`
        : `• Showing ${visible} of ${total} leads`;
  }

  // Empty CRM state
  if (leads.length === 0) {
    leadList.innerHTML = `
      <div class="locked-feature-card">
        <div class="locked-feature-icon">🚀</div>

        <h3>Start Building Your CRM</h3>

        <p>
          You have no leads yet.
          Add your first client lead or use the AI Lead Finder
          to start building your sales pipeline.
        </p>

        <div
          style="
            display:flex;
            gap:12px;
            flex-wrap:wrap;
            justify-content:center;
          "
        >
          <button class="primary-btn add-first-lead-btn">
            Add First Lead
          </button>

          <button class="secondary-btn open-lead-finder-btn">
            Open Lead Finder
          </button>
        </div>
      </div>
    `;

    const addFirstLeadButton =
      leadList.querySelector(".add-first-lead-btn");

    const openLeadFinderButton =
      leadList.querySelector(".open-lead-finder-btn");

    addFirstLeadButton?.addEventListener(
      "click",
      () => openLeadDrawer("add")
    );

    openLeadFinderButton?.addEventListener(
      "click",
      () => showPage("dashboardPage")
    );

    return;
  }

  // No search/filter matches
  if (filteredLeads.length === 0) {
    leadList.innerHTML = `
      <div class="leads-empty-filter">
        <h3>No leads found</h3>
        <p>
          No leads match your current search or status filter.
        </p>
      </div>
    `;

    return;
  }

  // Compact CRM workspace
  const workspace =
    document.createElement("div");

  workspace.className = "leads-workspace";

  workspace.innerHTML = `
    <div class="leads-table-header">
      <div>Lead</div>
      <div>Contact</div>
      <div>Status</div>
      <div>Score</div>
      <div>Follow-up</div>
      <div></div>
    </div>

    <div class="leads-table-body"></div>
  `;

  const tableBody =
    workspace.querySelector(
      ".leads-table-body"
    );

  filteredLeads.forEach(
    ({ lead, index }) => {
      const businessName =
        escapeHTML(
          lead.businessName ||
          "Unnamed Lead"
        );

      // Prefer the new dedicated contact fields.
      // Fall back to legacy contact for older leads.
      const rawContact =
        String(lead.email || "").trim() ||
        String(lead.phone || "").trim() ||
        String(lead.linkedin || "").trim() ||
        String(lead.contact || "").trim();

      const contact =
        escapeHTML(
          rawContact ||
          "No contact added"
        );

      // Normalize legacy statuses for display.
      // Older database records remain compatible
      // with the new 5-stage pipeline.
      const rawStatus =
        String(lead.status || "New")
          .trim()
          .toLowerCase();

      let displayStatus =
        lead.status || "New";

      if (
        [
          "interested",
          "proposal",
          "negotiation"
        ].includes(rawStatus)
      ) {
        displayStatus = "Qualified";
      } else if (
        [
          "replied",
          "follow_up",
          "follow up"
        ].includes(rawStatus)
      ) {
        displayStatus = "Follow-up";
      }

      const status =
        escapeHTML(displayStatus);

      const priority =
        escapeHTML(
          lead.priority || "Not set"
        );

      // Avoid treating null / blank AI scores as zero.
      const rawScore = lead.aiScore;

      const hasScore =
        rawScore !== null &&
        rawScore !== undefined &&
        String(rawScore).trim() !== "" &&
        Number.isFinite(
          Number(rawScore)
        );

      const numericScore =
        hasScore
          ? Number(rawScore)
          : null;

      let scoreLabel =
        "Not analyzed";

      let scoreClass =
        "lead-score-neutral";

      if (numericScore !== null) {
        if (numericScore >= 70) {
          scoreLabel =
            `🔥 ${numericScore}`;

          scoreClass =
            "lead-score-hot";
        } else if (
          numericScore >= 40
        ) {
          scoreLabel =
            `● ${numericScore}`;

          scoreClass =
            "lead-score-warm";
        } else {
          scoreLabel =
            `❄ ${numericScore}`;

          scoreClass =
            "lead-score-cold";
        }
      }

      const followUp =
        lead.followUpIntelligence || {};

      let followUpLabel =
        lead.nextFollowUp
          ? escapeHTML(
              lead.nextFollowUp
            )
          : "Not scheduled";

      let followUpClass = "";

      if (
        followUp.state === "overdue"
      ) {
        followUpLabel = "Overdue";

        followUpClass =
          "lead-followup-overdue";
      }

      if (
        followUp.state ===
        "closed_or_rejected"
      ) {
        followUpLabel =
          "No active follow-up";
      }

      const row =
        document.createElement("div");

      row.className =
        "lead-workspace-row";

      row.dataset.index =
        String(index);

      row.tabIndex = 0;

      row.setAttribute(
        "role",
        "button"
      );

      row.setAttribute(
        "aria-label",
        `Open ${
          lead.businessName ||
          "lead"
        } details`
      );

      row.innerHTML = `
        <div class="lead-workspace-business">
          <div class="lead-avatar">
            ${businessName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div class="lead-workspace-business-text">
            <strong>
              ${businessName}
            </strong>

            <span>
              ${priority} priority
            </span>
          </div>
        </div>

        <div class="lead-workspace-contact">
          ${contact}
        </div>

        <div>
          <span class="lead-status-pill">
            ${status}
          </span>
        </div>

        <div>
          <span class="lead-score-pill ${scoreClass}">
            ${scoreLabel}
          </span>
        </div>

        <div>
          <span class="${followUpClass}">
            ${followUpLabel}
          </span>
        </div>

        <div class="lead-workspace-open">
          <button
            type="button"
            class="lead-view-btn"
            data-index="${index}"
            aria-label="View ${businessName}"
          >
            View
            <span aria-hidden="true">
              →
            </span>
          </button>
        </div>
      `;

      tableBody.appendChild(row);
    }
  );

  leadList.appendChild(workspace);

  leadList
    .querySelectorAll(
      ".lead-workspace-row"
    )
    .forEach((row) => {
      const openSelectedLead = () => {
        const index =
          Number(
            row.dataset.index
          );

        const lead =
          leads[index];

        if (!lead) {
          showToast(
            "Lead could not be opened.",
            "error"
          );

          return;
        }

        openLeadDetails(index);
      };

      row.addEventListener(
        "click",
        openSelectedLead
      );

      row.addEventListener(
        "keydown",
        (event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            openSelectedLead();
          }
        }
      );
    });
}

function openLeadDetails(index) {
  const lead = leads[index];

  if (!lead) {
    showToast("Lead could not be opened.", "error");
    return;
  }

  document.getElementById("leadDetailsOverlay")?.remove();

  const businessName = escapeHTML(
    lead.businessName || "Unnamed Lead"
  );

  const contactPerson = escapeHTML(
    lead.contactPerson || "No contact person added"
  );

  const notes = escapeHTML(
    lead.notes || "No notes added yet."
  );

  const status = escapeHTML(
    lead.status || "New"
  );

  const priority = escapeHTML(
    lead.priority || "Not set"
  );

  /*
   * Contact channels
   */

  const legacyContact = String(
    lead.contact || ""
  ).trim();

  const legacyEmail =
    legacyContact.includes("@") &&
    !legacyContact.toLowerCase().includes("linkedin.com")
      ? legacyContact
      : "";

  const legacyLinkedIn =
    legacyContact.toLowerCase().includes("linkedin.com")
      ? legacyContact
      : "";

  const legacyPhone =
    !legacyEmail &&
    !legacyLinkedIn &&
    /[0-9]/.test(legacyContact)
      ? legacyContact
      : "";

  const rawEmail =
    String(
      lead.email ||
      legacyEmail ||
      ""
    ).trim();

  const rawPhone =
    String(
      lead.phone ||
      legacyPhone ||
      ""
    ).trim();

  const rawWebsite =
    String(
      lead.link ||
      ""
    ).trim();

  const rawLinkedIn =
    String(
      lead.linkedin ||
      legacyLinkedIn ||
      ""
    ).trim();

  const emailDisplay = escapeHTML(
    rawEmail || "No email added"
  );

  const phoneDisplay = escapeHTML(
    rawPhone || "No phone added"
  );

  const websiteDisplay = escapeHTML(
    rawWebsite || "No website added"
  );

  const linkedInDisplay = escapeHTML(
    rawLinkedIn || "No LinkedIn added"
  );

  const websiteUrl = sanitizeExternalUrl(
    rawWebsite
  );

  const linkedInUrl = sanitizeExternalUrl(
    rawLinkedIn
  );

  /*
   * Header contact summary
   */

  const contactSummary = escapeHTML(
    rawEmail ||
    rawPhone ||
    rawLinkedIn ||
    "No contact information added"
  );

  /*
   * AI score
   */

  const hasScore =
    lead.aiScore !== null &&
    lead.aiScore !== undefined &&
    String(lead.aiScore).trim() !== "";

  const numericScore =
    hasScore &&
    Number.isFinite(Number(lead.aiScore))
      ? Number(lead.aiScore)
      : null;

  let scoreLabel = "Not analyzed";
  let scoreClass = "lead-score-neutral";

  if (numericScore !== null) {
    if (numericScore >= 70) {
      scoreLabel = `🔥 ${numericScore} / 100`;
      scoreClass = "lead-score-hot";
    } else if (numericScore >= 40) {
      scoreLabel = `● ${numericScore} / 100`;
      scoreClass = "lead-score-warm";
    } else {
      scoreLabel = `❄ ${numericScore} / 100`;
      scoreClass = "lead-score-cold";
    }
  }

  /*
   * Follow-up intelligence
   */

  const followUp =
    lead.followUpIntelligence || {};

  let followUpText = lead.nextFollowUp
    ? escapeHTML(lead.nextFollowUp)
    : "Not scheduled";

  if (followUp.state === "overdue") {
    followUpText = "Overdue";
  }

  if (followUp.state === "closed_or_rejected") {
    followUpText = "No active follow-up";
  }

  /*
   * AI intelligence
   */

  const aiSummary = escapeHTML(
    lead.aiSummary ||
    lead.aiAnalysis ||
    lead.analysis ||
    "This lead has not been analyzed yet."
  );

  /*
   * Build modal
   */

  const overlay = document.createElement("div");

  overlay.id = "leadDetailsOverlay";
  overlay.className = "lead-details-overlay";

  overlay.innerHTML = `
    <div
      class="lead-details-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leadDetailsTitle"
    >
      <div class="lead-details-header">

        <div class="lead-details-heading">

          <div class="lead-details-avatar">
            ${businessName.charAt(0).toUpperCase()}
          </div>

          <div>
            <span class="lead-details-eyebrow">
              LEAD PROFILE
            </span>

            <h2 id="leadDetailsTitle">
              ${businessName}
            </h2>

            <p>
              ${contactSummary}
            </p>
          </div>

        </div>

        <button
          type="button"
          class="lead-details-close"
          aria-label="Close lead details"
        >
          ×
        </button>

      </div>

      <div class="lead-details-content">

        <section class="lead-details-section">

          <div class="lead-details-section-title">

            <div>
              <span class="lead-details-label">
                OVERVIEW
              </span>

              <h3>
                Lead information
              </h3>
            </div>

            <span class="lead-status-pill">
              ${status}
            </span>

          </div>

          <div class="lead-details-grid">

            <div class="lead-detail-field">
              <span>Business</span>
              <strong>${businessName}</strong>
            </div>

            <div class="lead-detail-field">
              <span>Contact person</span>
              <strong>${contactPerson}</strong>
            </div>

            <div class="lead-detail-field">
              <span>Email</span>

              ${
                rawEmail
                  ? `
                    <a href="mailto:${escapeHTML(rawEmail)}">
                      ${emailDisplay}
                    </a>
                  `
                  : `
                    <strong>
                      No email added
                    </strong>
                  `
              }
            </div>

            <div class="lead-detail-field">
              <span>Phone / WhatsApp</span>

              ${
                rawPhone
                  ? `
                    <a href="tel:${escapeHTML(rawPhone)}">
                      ${phoneDisplay}
                    </a>
                  `
                  : `
                    <strong>
                      No phone added
                    </strong>
                  `
              }
            </div>

            <div class="lead-detail-field">
              <span>Priority</span>
              <strong>${priority}</strong>
            </div>

            <div class="lead-detail-field">
              <span>Follow-up</span>
              <strong>${followUpText}</strong>
            </div>

            <div class="lead-detail-field lead-detail-field-wide">
              <span>Website</span>

              ${
                websiteUrl
                  ? `
                    <a
                      href="${websiteUrl}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ${websiteDisplay}
                    </a>
                  `
                  : `
                    <strong>
                      No website added
                    </strong>
                  `
              }
            </div>

            <div class="lead-detail-field lead-detail-field-wide">
              <span>LinkedIn</span>

              ${
                linkedInUrl
                  ? `
                    <a
                      href="${linkedInUrl}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ${linkedInDisplay}
                    </a>
                  `
                  : `
                    <strong>
                      No LinkedIn added
                    </strong>
                  `
              }
            </div>

          </div>

        </section>

        <section class="lead-details-section">

          <div class="lead-details-section-title">
            <div>
              <span class="lead-details-label">
                NOTES
              </span>

              <h3>
                Lead notes
              </h3>
            </div>
          </div>

       <div class="lead-details-notes">
        <p class="lead-details-notes-text">${notes}</p>
      </div>

        </section>

        <section class="lead-details-section">

          <div class="lead-details-section-title">

            <div>
              <span class="lead-details-label">
                AI INTELLIGENCE
              </span>

              <h3>
                Lead analysis
              </h3>
            </div>

            <span class="lead-score-pill ${scoreClass}">
              ${scoreLabel}
            </span>

          </div>

          <div class="lead-details-ai">
            ${aiSummary}
          </div>

          <button
            type="button"
            class="lead-modal-analyze-btn"
          >
            Analyze Lead
          </button>

        </section>

      </div>

      <div class="lead-details-actions">

        <button
          type="button"
          class="secondary-btn lead-modal-more-btn"
        >
          More
        </button>

        <div class="lead-details-primary-actions">

          <button
            type="button"
            class="secondary-btn lead-modal-edit-btn"
          >
            Edit
          </button>

          <button
            type="button"
            class="secondary-btn lead-modal-email-btn"
          >
            Email
          </button>

          <button
            type="button"
            class="secondary-btn lead-modal-outreach-btn"
          >
            AI Outreach
          </button>

        </div>

      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  const modal = overlay.querySelector(
    ".lead-details-modal"
  );

  const closeButton = overlay.querySelector(
    ".lead-details-close"
  );

  const analyzeButton = overlay.querySelector(
    ".lead-modal-analyze-btn"
  );

  const outreachButton = overlay.querySelector(
    ".lead-modal-outreach-btn"
  );

  const emailButton = overlay.querySelector(
    ".lead-modal-email-btn"
  );

  const editButton = overlay.querySelector(
    ".lead-modal-edit-btn"
  );

  const moreButton = overlay.querySelector(
    ".lead-modal-more-btn"
  );

  function closeLeadDetails() {
    overlay.remove();

    document.removeEventListener(
      "keydown",
      handleLeadDetailsEscape
    );
  }

  function handleLeadDetailsEscape(event) {
    if (event.key === "Escape") {
      closeLeadDetails();
    }
  }

  closeButton?.addEventListener(
    "click",
    closeLeadDetails
  );

  overlay.addEventListener(
    "click",
    (event) => {
      if (event.target === overlay) {
        closeLeadDetails();
      }
    }
  );

  modal?.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
    }
  );

  document.addEventListener(
    "keydown",
    handleLeadDetailsEscape
  );

  analyzeButton?.addEventListener(
    "click",
    async () => {
      closeLeadDetails();
      await handleAnalyzeLead(index);
    }
  );

  outreachButton?.addEventListener(
    "click",
    () => {
      closeLeadDetails();
      handleGenerate(index);
    }
  );

  emailButton?.addEventListener(
    "click",
    () => {
      closeLeadDetails();
      sendEmail(index);
    }
  );

  editButton?.addEventListener(
    "click",
    () => {
      closeLeadDetails();
      editLead(index);
    }
  );

  moreButton?.addEventListener(
    "click",
    () => {
      closeLeadDetails();
      openLeadMoreActions(index);
    }
  );

  closeButton?.focus();
}

function normalizeUrl(value) {
  const url = String(value || "").trim();

  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `https://${url}`;
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

  const businessName =
    document
      .getElementById("businessName")
      .value
      .trim();

  const contactPerson =
    document
      .getElementById("contactPerson")
      .value
      .trim();

  const leadEmail =
    document
      .getElementById("leadEmail")
      .value
      .trim();

  const leadPhone =
    document
      .getElementById("leadPhone")
      .value
      .trim();

  const leadLink = normalizeUrl(
    document.getElementById("leadLink").value
  );

  const leadLinkedIn = normalizeUrl(
    document.getElementById("leadLinkedIn").value
  );

  const priority =
    document.getElementById("priority").value;

  const notes =
    document
      .getElementById("notes")
      .value
      .trim();

  const wasEditing =
    editIndex !== null;

  // Keep the legacy contact field populated
  // for backwards compatibility.
  const legacyContact =
    leadEmail ||
    leadPhone ||
    leadLinkedIn ||
    "";

  const leadData = {
    userId: currentUser.id,

    businessName:
      businessName || "Untitled Lead",

    contactPerson:
      contactPerson || "",

    email:
      leadEmail,

    phone:
      leadPhone,

    link:
      leadLink,

    linkedin:
      leadLinkedIn,

    contact:
      legacyContact,

    priority:
      priority || "Cold",

    notes:
      notes || "",

    status:
      "New",

    createdAt:
      new Date().toLocaleString(),

    lastContacted:
      "",

    nextFollowUp:
      ""
  };

  try {
    let response;

    if (wasEditing) {
      const existingLead =
        leads[editIndex];

      const leadId =
        existingLead.id;

      response = await fetch(
        `${API_URL}/${leadId}`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            ...leadData,

            status:
              existingLead.status ||
              "New",

            createdAt:
              existingLead.createdAt ||
              leadData.createdAt,

            lastContacted:
              existingLead.lastContacted ||
              "",

            nextFollowUp:
              existingLead.nextFollowUp ||
              ""
          })
        }
      );
    } else {
      response = await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(leadData)
        }
      );
    }

    const data =
      await readJsonResponse(response);

    if (!response.ok) {
      console.error(
        "Save lead server error:",
        data
      );

      alert(
        data.error ||
        "Could not save lead. Check backend logs."
      );

      showToast(
        data.error ||
        "Could not save lead.",
        "error"
      );

      return;
    }

    // Only reset editing state after
    // the backend confirms success.
    editIndex = null;

    const submitButton =
      leadForm.querySelector(
        "button[type='submit']"
      );

    if (submitButton) {
      submitButton.textContent =
        "Add Lead";
    }

    leadForm.reset();

    await fetchLeads();

    // Close the Add Lead modal automatically
    // after a successful save.
    closeLeadDrawer();

    showPage("leadsPage");

    showToast(
      wasEditing
        ? "Lead updated successfully."
        : "Lead saved successfully.",
      "success"
    );

  } catch (error) {
    console.error(
      "Save lead connection error:",
      error
    );

    alert(
      "Could not connect to backend. Check Console and backend logs."
    );

    showToast(
      "Could not connect to backend.",
      "error"
    );
  }
});

function editLead(index) {
  const lead = leads[index];

  if (!lead) {
    showToast("Lead not found.", "error");
    return;
  }

  document.querySelectorAll(".lead-edit-modal").forEach((modal) => {
    modal.remove();
  });

  const legacyContact = String(lead.contact || "").trim();

  const legacyEmail =
    legacyContact.includes("@") &&
    !legacyContact.toLowerCase().includes("linkedin.com")
      ? legacyContact
      : "";

  const legacyLinkedIn =
    legacyContact.toLowerCase().includes("linkedin.com")
      ? legacyContact
      : "";

  const legacyPhone =
    !legacyEmail &&
    !legacyLinkedIn &&
    /[0-9]/.test(legacyContact)
      ? legacyContact
      : "";

  const currentEmail = lead.email || legacyEmail || "";
  const currentPhone = lead.phone || legacyPhone || "";
  const currentWebsite = lead.link || "";
  const currentLinkedIn = lead.linkedin || legacyLinkedIn || "";

  const overlay = document.createElement("div");
  overlay.className = "lead-edit-modal";

  overlay.innerHTML = `
    <div class="lead-edit-backdrop"></div>

    <section
      class="lead-edit-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editLeadTitle"
    >
      <div class="lead-edit-header">
        <div>
          <span class="lead-edit-eyebrow">LEAD WORKSPACE</span>
          <h2 id="editLeadTitle">Edit Lead</h2>
          <p>Update this prospect's information.</p>
        </div>

        <button
          type="button"
          class="lead-edit-close"
          aria-label="Close edit lead"
        >
          ×
        </button>
      </div>

      <form class="lead-edit-form">
        <div class="lead-edit-body">
          <label class="lead-edit-full-width">
            Business name
            <input
              type="text"
              name="businessName"
              value="${escapeHTML(lead.businessName || "")}"
              maxlength="150"
              required
            />
          </label>

          <label>
            Contact person
            <input
              type="text"
              name="contactPerson"
              value="${escapeHTML(lead.contactPerson || "")}"
              maxlength="150"
              placeholder="e.g. Sarah Jacobs"
              autocomplete="name"
            />
          </label>

          <label>
            Email address
            <input
              type="email"
              name="email"
              value="${escapeHTML(currentEmail)}"
              maxlength="254"
              placeholder="name@example.com"
              autocomplete="email"
            />
          </label>

          <label>
            Phone / WhatsApp number
            <input
              type="tel"
              name="phone"
              value="${escapeHTML(currentPhone)}"
              maxlength="50"
              placeholder="+27 82 123 4567"
              autocomplete="tel"
            />
          </label>

          <label class="lead-edit-full-width">
            Website
            <input
              type="text"
              name="link"
              value="${escapeHTML(currentWebsite)}"
              placeholder="www.example.com"
              autocomplete="url"
            />
          </label>

          <label class="lead-edit-full-width">
            LinkedIn profile
            <input
              type="text"
              name="linkedin"
              value="${escapeHTML(currentLinkedIn)}"
              placeholder="www.linkedin.com/in/username"
              autocomplete="url"
            />
          </label>

          <label>
            Priority
            <select name="priority">
              <option value="Cold" ${
                lead.priority === "Cold" ? "selected" : ""
              }>Cold Lead</option>

              <option value="Warm" ${
                lead.priority === "Warm" ? "selected" : ""
              }>Warm Lead</option>

              <option value="Hot" ${
                lead.priority === "Hot" ? "selected" : ""
              }>Hot Lead</option>
            </select>
          </label>

          <label>
            Status
            <select name="status">
              <option value="New" ${
                lead.status === "New" ? "selected" : ""
              }>New</option>

              <option value="Contacted" ${
                lead.status === "Contacted" ? "selected" : ""
              }>Contacted</option>

              <option value="Follow-up" ${
                lead.status === "Follow-up" ? "selected" : ""
              }>Follow-up</option>

              <option value="Qualified" ${
                lead.status === "Qualified" ? "selected" : ""
              }>Qualified</option>

              <option value="Closed" ${
                lead.status === "Closed" ? "selected" : ""
              }>Closed</option>
            </select>
          </label>

          <label>
            Next follow-up
            <input
              type="date"
              name="nextFollowUp"
              value="${escapeHTML(lead.nextFollowUp || "")}"
            />
          </label>

          <label class="lead-edit-full-width lead-edit-notes-field">
            Notes
            <textarea
              name="notes"
              maxlength="5000"
              placeholder="Notes about this lead"
            >${escapeHTML(lead.notes || "")}</textarea>
          </label>
        </div>

        <div class="lead-edit-footer">
          <button
            type="button"
            class="lead-edit-cancel"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="lead-edit-save"
          >
            Save Changes
          </button>
        </div>
      </form>
    </section>
  `;

  document.body.appendChild(overlay);

  const form = overlay.querySelector(".lead-edit-form");
  const closeButton = overlay.querySelector(".lead-edit-close");
  const cancelButton = overlay.querySelector(".lead-edit-cancel");
  const backdrop = overlay.querySelector(".lead-edit-backdrop");
  const firstInput = form.querySelector('input[name="businessName"]');

  const closeModal = () => {
    document.removeEventListener("keydown", handleEscape);

    if (overlay.parentNode) {
      overlay.remove();
    }
  };

  const handleEscape = (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  };

  closeButton.addEventListener("click", closeModal);
  cancelButton.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", handleEscape);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);

    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();

    const website = normalizeUrl(
      formData.get("link")
    );

    const linkedin = normalizeUrl(
      formData.get("linkedin")
    );

    const legacyContact =
      email ||
      phone ||
      linkedin ||
      "";

    const updatedLead = {
      businessName: String(
        formData.get("businessName") || ""
      ).trim(),

      contactPerson: String(
        formData.get("contactPerson") || ""
      ).trim(),

      email: email,
      phone: phone,
      link: website,
      linkedin: linkedin,
      contact: legacyContact,

      priority: String(
        formData.get("priority") || "Cold"
      ),

      status: String(
        formData.get("status") || "New"
      ),

      nextFollowUp: String(
        formData.get("nextFollowUp") || ""
      ),

      notes: String(
        formData.get("notes") || ""
      ).trim(),

      createdAt: lead.createdAt || "",
      lastContacted: lead.lastContacted || ""
    };

    if (!updatedLead.businessName) {
      showToast(
        "Business name is required.",
        "warning"
      );
      return;
    }

    const saveButton = form.querySelector(".lead-edit-save");
    const originalButtonText = saveButton.textContent;

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
      const response = await fetch(
        `${API_URL}/${lead.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(updatedLead)
        }
      );

      const data = await readJsonResponse(response);

      if (!response.ok) {
        console.error("Update lead server error:", data);

        showToast(
          data.error || "Could not update lead.",
          "error"
        );

        return;
      }

      await fetchLeads();

      closeModal();

      showToast(
        "Lead updated successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "Update lead connection error:",
        error
      );

      showToast(
        "Could not connect to backend.",
        "error"
      );
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = originalButtonText;
    }
  });

  requestAnimationFrame(() => {
    firstInput?.focus();
  });
}

function openLeadMoreActions(index) {
  const lead = leads[index];

  if (!lead) {
    showToast("Lead not found.", "error");
    return;
  }

  document.getElementById("leadMoreActionsOverlay")?.remove();

  const businessName =
    lead.businessName || "Lead";

  const contact =
    lead.contact || "No contact information";

  const overlay = document.createElement("div");

  overlay.id = "leadMoreActionsOverlay";
  overlay.className = "lead-more-actions-overlay";

  overlay.innerHTML = `
    <div
      class="lead-more-actions-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leadMoreActionsTitle"
    >
      <div class="lead-more-actions-header">

        <div>
          <p class="lead-more-actions-eyebrow">
            LEAD ACTIONS
          </p>

          <h2 id="leadMoreActionsTitle">
            More Actions
          </h2>

          <p class="lead-more-actions-subtitle">
            ${escapeHTML(businessName)}
          </p>
        </div>

        <button
          type="button"
          class="lead-more-actions-close"
          aria-label="Close more actions"
        >
          &times;
        </button>

      </div>

      <div class="lead-more-actions-body">

        <div class="lead-more-actions-contact">
          <div class="lead-more-actions-avatar">
            ${escapeHTML(
              businessName.charAt(0).toUpperCase()
            )}
          </div>

          <div>
            <strong>
              ${escapeHTML(businessName)}
            </strong>

            <span>
              ${escapeHTML(contact)}
            </span>
          </div>
        </div>

        <div class="lead-more-actions-grid">

          <button
            type="button"
            class="lead-more-action-card"
            data-action="whatsapp"
          >
            <span class="lead-more-action-icon">
              💬
            </span>

            <span class="lead-more-action-content">
              <strong>WhatsApp</strong>
              <small>
                Start a WhatsApp conversation
              </small>
            </span>

            <span class="lead-more-action-arrow">
              ›
            </span>
          </button>

          <button
            type="button"
            class="lead-more-action-card"
            data-action="linkedin"
          >
            <span class="lead-more-action-icon">
              in
            </span>

            <span class="lead-more-action-content">
              <strong>LinkedIn</strong>
              <small>
                Open LinkedIn for this lead
              </small>
            </span>

            <span class="lead-more-action-arrow">
              ›
            </span>
          </button>

          <button
            type="button"
            class="lead-more-action-card"
            data-action="followup"
          >
            <span class="lead-more-action-icon">
              ◷
            </span>

            <span class="lead-more-action-content">
              <strong>Schedule Follow-up</strong>
              <small>
                Set the next follow-up date
              </small>
            </span>

            <span class="lead-more-action-arrow">
              ›
            </span>
          </button>

          <button
            type="button"
            class="lead-more-action-card"
            data-action="edit"
          >
            <span class="lead-more-action-icon">
              ✎
            </span>

            <span class="lead-more-action-content">
              <strong>Edit Lead</strong>
              <small>
                Update lead information
              </small>
            </span>

            <span class="lead-more-action-arrow">
              ›
            </span>
          </button>

        </div>

        <div class="lead-more-actions-danger">

          <p>
            Lead management
          </p>

          <button
            type="button"
            class="lead-more-delete-button"
            data-action="delete"
          >
            <span>Delete Lead</span>
            <span>Remove this lead from your CRM</span>
          </button>

        </div>

      </div>

      <div class="lead-more-actions-footer">

        <button
          type="button"
          class="lead-more-actions-back"
        >
          Back to Lead
        </button>

        <button
          type="button"
          class="lead-more-actions-done"
        >
          Done
        </button>

      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const modal =
    overlay.querySelector(
      ".lead-more-actions-modal"
    );

  const closeButton =
    overlay.querySelector(
      ".lead-more-actions-close"
    );

  const backButton =
    overlay.querySelector(
      ".lead-more-actions-back"
    );

  const doneButton =
    overlay.querySelector(
      ".lead-more-actions-done"
    );

  const whatsappButton =
    overlay.querySelector(
      '[data-action="whatsapp"]'
    );

  const linkedinButton =
    overlay.querySelector(
      '[data-action="linkedin"]'
    );

  const followUpButton =
    overlay.querySelector(
      '[data-action="followup"]'
    );

  const editButton =
    overlay.querySelector(
      '[data-action="edit"]'
    );

  const deleteButton =
    overlay.querySelector(
      '[data-action="delete"]'
    );

  let isClosing = false;

  const removeModal = () => {
    document.removeEventListener(
      "keydown",
      handleEscape
    );

    overlay.remove();
  };

  const closeActions = () => {
    if (isClosing) return;

    isClosing = true;
    removeModal();
  };

  const returnToLead = () => {
    if (isClosing) return;

    isClosing = true;

    removeModal();
    openLeadDetails(index);
  };

  const handleEscape = event => {
    if (event.key === "Escape") {
      returnToLead();
    }
  };

  closeButton?.addEventListener(
    "click",
    returnToLead
  );

  backButton?.addEventListener(
    "click",
    returnToLead
  );

  doneButton?.addEventListener(
    "click",
    closeActions
  );

  overlay.addEventListener(
    "click",
    event => {
      if (event.target === overlay) {
        returnToLead();
      }
    }
  );

  modal?.addEventListener(
    "click",
    event => {
      event.stopPropagation();
    }
  );

  whatsappButton?.addEventListener(
    "click",
    () => {
      closeActions();

      if (typeof sendWhatsApp === "function") {
        sendWhatsApp(index);
        return;
      }

      showToast(
        "WhatsApp action is unavailable.",
        "warning"
      );
    }
  );

  linkedinButton?.addEventListener(
  "click",
  () => {
    closeActions();

    if (typeof sendLinkedIn === "function") {
      sendLinkedIn(index);
      return;
    }

    showToast(
      "LinkedIn action is unavailable.",
      "warning"
    );
  }
);

  followUpButton?.addEventListener(
    "click",
    () => {
      closeActions();

      if (typeof setFollowUp === "function") {
        setFollowUp(index);
        return;
      }

      showToast(
        "Follow-up action is unavailable.",
        "warning"
      );
    }
  );

  editButton?.addEventListener(
    "click",
    () => {
      closeActions();
      editLead(index);
    }
  );

  deleteButton?.addEventListener(
    "click",
    () => {
      closeActions();
      deleteLead(index);
    }
  );

  document.addEventListener(
    "keydown",
    handleEscape
  );

  closeButton?.focus();
}

async function deleteLead(index) {
  const lead = leads[index];

  if (!lead) {
    showToast("Lead not found.", "error");
    return;
  }

  document.getElementById("deleteLeadOverlay")?.remove();

  const businessName =
    lead.businessName || "this lead";

  const overlay = document.createElement("div");

  overlay.id = "deleteLeadOverlay";
  overlay.className = "delete-lead-overlay";

  overlay.innerHTML = `
    <div
      class="delete-lead-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deleteLeadTitle"
    >
      <div class="delete-lead-icon">
        !
      </div>

      <div class="delete-lead-content">

        <p class="delete-lead-eyebrow">
          DELETE LEAD
        </p>

        <h2 id="deleteLeadTitle">
          Delete ${escapeHTML(businessName)}?
        </h2>

        <p class="delete-lead-message">
          This will permanently remove this lead from
          your CRM. This action cannot be undone.
        </p>

        <div class="delete-lead-warning">
          <strong>
            ${escapeHTML(businessName)}
          </strong>

          <span>
            ${
              lead.contact
                ? escapeHTML(lead.contact)
                : "No contact information"
            }
          </span>
        </div>

      </div>

      <div class="delete-lead-footer">

        <button
          type="button"
          class="delete-lead-cancel"
        >
          Cancel
        </button>

        <button
          type="button"
          class="delete-lead-confirm"
        >
          Delete Lead
        </button>

      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const modal =
    overlay.querySelector(".delete-lead-modal");

  const cancelButton =
    overlay.querySelector(".delete-lead-cancel");

  const deleteButton =
    overlay.querySelector(".delete-lead-confirm");

  let isDeleting = false;

  const closeDeleteModal = () => {
    if (isDeleting) return;

    document.removeEventListener(
      "keydown",
      handleEscape
    );

    overlay.remove();
  };

  const handleEscape = event => {
    if (
      event.key === "Escape" &&
      !isDeleting
    ) {
      closeDeleteModal();
    }
  };

  cancelButton?.addEventListener(
    "click",
    closeDeleteModal
  );

  overlay.addEventListener(
    "click",
    event => {
      if (event.target === overlay) {
        closeDeleteModal();
      }
    }
  );

  modal?.addEventListener(
    "click",
    event => {
      event.stopPropagation();
    }
  );

  deleteButton?.addEventListener(
    "click",
    async () => {
      if (isDeleting) return;

      isDeleting = true;

      deleteButton.disabled = true;
      deleteButton.textContent =
        "Deleting...";

      cancelButton.disabled = true;

      try {
        const response = await fetch(
          `${API_URL}/${lead.id}`,
          {
            method: "DELETE"
          }
        );

        const data =
          await readJsonResponse(response);

        if (!response.ok) {
          console.error(
            "Delete lead server error:",
            data
          );

          showToast(
            data.error ||
            "Could not delete lead.",
            "error"
          );

          return;
        }

        await fetchLeads();

        document.removeEventListener(
          "keydown",
          handleEscape
        );

        overlay.remove();

        showToast(
          "Lead deleted successfully.",
          "success"
        );

      } catch (error) {
        console.error(
          "Delete lead connection error:",
          error
        );

        showToast(
          "Could not connect to backend.",
          "error"
        );

      } finally {
        isDeleting = false;

        if (document.body.contains(deleteButton)) {
          deleteButton.disabled = false;
          deleteButton.textContent =
            "Delete Lead";

          cancelButton.disabled = false;
        }
      }
    }
  );

  document.addEventListener(
    "keydown",
    handleEscape
  );

  cancelButton?.focus();
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

async function markContacted(index) {
  const lead = leads[index];

  if (!lead) {
    showToast(
      "Lead not found.",
      "error"
    );
    return false;
  }

  if (!currentUser) {
    showToast(
      "Please login first.",
      "warning"
    );
    return false;
  }

  const currentStatus =
    String(
      lead.status || "New"
    ).trim();

  const statusLower =
    currentStatus.toLowerCase();

  const closedStatuses = [
    "closed",
    "lost",
    "rejected"
  ];

  if (
    closedStatuses.includes(
      statusLower
    )
  ) {
    showToast(
      "Reopen this lead before marking it as contacted.",
      "warning"
    );
    return false;
  }

  // Only a New lead should automatically move
  // to Contacted.
  //
  // More advanced pipeline states such as
  // Interested, Proposal or Negotiation
  // should not be downgraded.
  const updatedStatus =
    statusLower === "new"
      ? "Contacted"
      : currentStatus;

  const now = new Date();

  const lastContacted =
    `${now.getFullYear()}-` +
    `${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-` +
    `${String(
      now.getDate()
    ).padStart(2, "0")} ` +
    `${String(
      now.getHours()
    ).padStart(2, "0")}:` +
    `${String(
      now.getMinutes()
    ).padStart(2, "0")}:` +
    `${String(
      now.getSeconds()
    ).padStart(2, "0")}`;

  try {
    const response = await fetch(
      `${API_URL}/${lead.id}`,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          ...lead,
          userId: currentUser.id,
          status: updatedStatus,
          lastContacted
        })
      }
    );

    const data =
      await readJsonResponse(
        response
      );

    if (!response.ok) {
      console.error(
        "Mark contacted server error:",
        data
      );

      showToast(
        data.error ||
        "Could not mark lead as contacted.",
        "error"
      );

      return false;
    }

    // Reload the lead so follow-up intelligence
    // is recalculated by the backend.
    await fetchLeads();

    // Refresh activity history as well.
    await fetchActivities();

    showToast(
      "Lead marked as contacted.",
      "success"
    );

    return true;

  } catch (error) {
    console.error(
      "Mark contacted connection error:",
      error
    );

    showToast(
      "Could not connect to backend.",
      "error"
    );

    return false;
  }
}
function showContactConfirmation(
  index,
  channel
) {
  const lead = leads[index];

  if (!lead) {
    showToast(
      "Lead could not be found.",
      "error"
    );
    return;
  }

  // Prevent duplicate confirmation modals.
  document
    .getElementById("contactConfirmationOverlay")
    ?.remove();

  const businessName =
    String(
      lead.businessName || "this lead"
    ).trim();

  const channelName =
    String(channel || "outreach").trim();

  const overlay =
    document.createElement("div");

  overlay.id =
    "contactConfirmationOverlay";

  overlay.className =
    "follow-up-overlay";

  overlay.innerHTML = `
    <div
      class="follow-up-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contactConfirmationTitle"
    >
      <div class="follow-up-header">

        <div>
          <p class="follow-up-eyebrow">
            OUTREACH CONFIRMATION
          </p>

          <h2 id="contactConfirmationTitle">
            Did you send the message?
          </h2>

          <p class="follow-up-subtitle">
            ${escapeHTML(businessName)}
          </p>
        </div>

        <button
          type="button"
          class="follow-up-close"
          aria-label="Close confirmation"
        >
          &times;
        </button>

      </div>

      <div class="follow-up-body">

        <div class="follow-up-lead-card">

          <div class="follow-up-lead-avatar">
            ${escapeHTML(
              businessName
                .charAt(0)
                .toUpperCase()
            )}
          </div>

          <div>
            <strong>
              ${escapeHTML(businessName)}
            </strong>

            <span>
              ${escapeHTML(channelName)}
              outreach opened
            </span>
          </div>

        </div>

        <p>
          Only mark this lead as contacted
          if you actually sent the message
          through ${escapeHTML(channelName)}.
        </p>

      </div>

      <div class="follow-up-footer">

        <button
          type="button"
          class="secondary-btn contact-not-yet"
        >
          Not Yet
        </button>

        <button
          type="button"
          class="primary-btn contact-confirm"
        >
          Mark as Contacted
        </button>

      </div>
    </div>
  `;

  document.body.appendChild(
    overlay
  );

  const closeButton =
    overlay.querySelector(
      ".follow-up-close"
    );

  const notYetButton =
    overlay.querySelector(
      ".contact-not-yet"
    );

  const confirmButton =
    overlay.querySelector(
      ".contact-confirm"
    );

  function closeConfirmation() {
    overlay.remove();

    document.removeEventListener(
      "keydown",
      handleEscape
    );
  }

  function handleEscape(event) {
    if (event.key === "Escape") {
      closeConfirmation();
    }
  }

  closeButton.addEventListener(
    "click",
    closeConfirmation
  );

  notYetButton.addEventListener(
    "click",
    () => {
      closeConfirmation();

      showToast(
        "Lead was not marked as contacted.",
        "info"
      );
    }
  );

  confirmButton.addEventListener(
    "click",
    async () => {
      confirmButton.disabled = true;
      notYetButton.disabled = true;

      confirmButton.textContent =
        "Updating...";

      const updated =
        await markContacted(index);

      if (!updated) {
        confirmButton.disabled = false;
        notYetButton.disabled = false;

        confirmButton.textContent =
          "Mark as Contacted";

        return;
      }

      logActivity(
        lead.id,
        `${channelName} Outreach Sent`,
        `${channelName} outreach was confirmed as sent to ${businessName}.`
      );

      closeConfirmation();
    }
  );

  overlay.addEventListener(
    "click",
    event => {
      if (event.target === overlay) {
        closeConfirmation();
      }
    }
  );

  document.addEventListener(
    "keydown",
    handleEscape
  );

  notYetButton.focus();
}

function setFollowUp(index) {
  const lead = leads[index];

  if (!lead) {
    showToast(
      "Lead not found.",
      "error"
    );
    return;
  }

  document
    .getElementById("followUpOverlay")
    ?.remove();

  const businessName =
    lead.businessName || "Lead";

  const currentFollowUp =
    lead.nextFollowUp || "";

  // Use the user's local date rather than UTC.
  const now = new Date();

  const localToday =
    `${now.getFullYear()}-` +
    `${String(now.getMonth() + 1).padStart(2, "0")}-` +
    `${String(now.getDate()).padStart(2, "0")}`;

  const overlay =
    document.createElement("div");

  overlay.id = "followUpOverlay";
  overlay.className = "follow-up-overlay";

  overlay.innerHTML = `
    <div
      class="follow-up-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="followUpModalTitle"
    >
      <div class="follow-up-header">

        <div>
          <p class="follow-up-eyebrow">
            FOLLOW-UP
          </p>

          <h2 id="followUpModalTitle">
            Schedule Follow-up
          </h2>

          <p class="follow-up-subtitle">
            ${escapeHTML(businessName)}
          </p>
        </div>

        <button
          type="button"
          class="follow-up-close"
          aria-label="Close follow-up scheduler"
        >
          &times;
        </button>

      </div>

      <div class="follow-up-body">

        <div class="follow-up-lead-card">

          <div class="follow-up-lead-avatar">
            ${escapeHTML(
              businessName
                .charAt(0)
                .toUpperCase()
            )}
          </div>

          <div>
            <strong>
              ${escapeHTML(businessName)}
            </strong>

            <span>
              ${
                currentFollowUp
                  ? `Currently scheduled for ${escapeHTML(currentFollowUp)}`
                  : "No follow-up currently scheduled"
              }
            </span>
          </div>

        </div>

        <div class="follow-up-field">

          <label for="followUpDate">
            Follow-up Date
          </label>

          <input
            id="followUpDate"
            type="date"
            min="${localToday}"
            value="${escapeHTML(currentFollowUp)}"
          >

          <small>
            Choose when you want to follow up with this lead.
          </small>

        </div>

      </div>

      <div class="follow-up-footer">

        <button
          type="button"
          class="follow-up-cancel"
        >
          Cancel
        </button>

        <button
          type="button"
          class="follow-up-save"
        >
          Schedule Follow-up
        </button>

      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const modal =
    overlay.querySelector(
      ".follow-up-modal"
    );

  const closeButton =
    overlay.querySelector(
      ".follow-up-close"
    );

  const cancelButton =
    overlay.querySelector(
      ".follow-up-cancel"
    );

  const saveButton =
    overlay.querySelector(
      ".follow-up-save"
    );

  const dateInput =
    overlay.querySelector(
      "#followUpDate"
    );

  let isSaving = false;

  const closeFollowUp = () => {
    if (isSaving) {
      return;
    }

    document.removeEventListener(
      "keydown",
      handleEscape
    );

    overlay.remove();
  };

  const handleEscape = event => {
    if (
      event.key === "Escape" &&
      !isSaving
    ) {
      closeFollowUp();
    }
  };

  closeButton?.addEventListener(
    "click",
    closeFollowUp
  );

  cancelButton?.addEventListener(
    "click",
    closeFollowUp
  );

  overlay.addEventListener(
    "click",
    event => {
      if (event.target === overlay) {
        closeFollowUp();
      }
    }
  );

  modal?.addEventListener(
    "click",
    event => {
      event.stopPropagation();
    }
  );

  saveButton?.addEventListener(
    "click",
    async () => {
      if (isSaving) {
        return;
      }

      const date =
        dateInput.value.trim();

      if (!date) {
        showToast(
          "Please choose a follow-up date.",
          "warning"
        );

        dateInput.focus();
        return;
      }

      if (date < localToday) {
        showToast(
          "Follow-up date cannot be in the past.",
          "warning"
        );

        dateInput.focus();
        return;
      }

      isSaving = true;

      saveButton.disabled = true;
      saveButton.textContent =
        "Scheduling...";

      closeButton.disabled = true;
      cancelButton.disabled = true;

      try {
        const response = await fetch(
          `${API_URL}/${lead.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              ...lead,
              userId: currentUser.id,

              // Scheduling a follow-up should only
              // change the next follow-up date.
              //
              // lastContacted is deliberately preserved.
              nextFollowUp: date
            })
          }
        );

        const data =
          await readJsonResponse(
            response
          );

        if (!response.ok) {
          console.error(
            "Follow-up server error:",
            data
          );

          showToast(
            data.error ||
            "Could not schedule follow-up.",
            "error"
          );

          return;
        }

        // Reload leads so the backend-generated
        // follow-up intelligence is immediately
        // reflected throughout AutoClient.
        await fetchLeads();

        // Refresh activities so the
        // "Follow-up Scheduled" activity appears.
        await fetchActivities();

        document.removeEventListener(
          "keydown",
          handleEscape
        );

        overlay.remove();

        showToast(
          "Follow-up scheduled successfully.",
          "success"
        );

      } catch (error) {
        console.error(
          "Follow-up connection error:",
          error
        );

        showToast(
          "Could not connect to backend.",
          "error"
        );

      } finally {
        isSaving = false;

        if (
          document.body.contains(
            saveButton
          )
        ) {
          saveButton.disabled = false;
          saveButton.textContent =
            "Schedule Follow-up";

          closeButton.disabled = false;
          cancelButton.disabled = false;
        }
      }
    }
  );

  document.addEventListener(
    "keydown",
    handleEscape
  );

  dateInput?.focus();
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
  const service =
    serviceInput.value.trim() || "my services";

  const style = messageStyle.value;

  const businessName =
    lead && lead.businessName
      ? lead.businessName.trim()
      : "your business";

  const recipientName =
    lead && lead.contactPerson
      ? lead.contactPerson.trim()
      : businessName;

  const userName =
    currentUser && currentUser.name
      ? currentUser.name.trim()
      : "AutoClient User";

  const followUp =
    lead && lead.followUpIntelligence
      ? lead.followUpIntelligence
      : {};

  const followUpState =
    followUp.state || "";

  const status =
    lead && lead.status
      ? lead.status.trim().toLowerCase()
      : "";

  const interestedStatuses = [
    "interested",
    "qualified",
    "proposal",
    "negotiation"
  ];

  const closedStatuses = [
    "closed",
    "lost",
    "rejected"
  ];

  // Internal CRM notes are deliberately excluded
  // from all customer-facing fallback messages.

  if (
    closedStatuses.includes(status) ||
    followUpState === "closed_or_rejected"
  ) {
    return "";
  }

  if (followUpState === "overdue") {
    return `Good day ${recipientName},

I wanted to follow up on my previous message regarding ${service}.

I understand schedules can become busy, so I wanted to check whether this is still something worth discussing.

If so, I would be happy to arrange a short conversation at a convenient time.

Kind regards,
${userName}`;
  }

  if (followUpState === "due_today") {
    return `Good day ${recipientName},

I am following up as planned regarding ${service}.

I wanted to check whether you would be open to continuing the conversation and discussing whether there is a suitable next step.

Kind regards,
${userName}`;
  }

  if (
    followUpState === "upcoming" ||
    followUpState === "scheduled"
  ) {
    return `Good day ${recipientName},

I wanted to touch base ahead of our planned follow-up.

I wanted to check whether there have been any developments and whether it would still be useful to continue our conversation regarding ${service}.

Kind regards,
${userName}`;
  }

  if (followUpState === "needs_follow_up") {
    return `Good day ${recipientName},

I wanted to follow up after our previous contact regarding ${service}.

Please let me know whether this is still something you would be open to discussing.

Kind regards,
${userName}`;
  }

  if (interestedStatuses.includes(status)) {
    return `Good day ${recipientName},

Thank you for the interest shown so far.

I would be happy to continue the conversation and discuss how ${service} could support your business.

Would you be available for a short conversation to discuss the next step?

Kind regards,
${userName}`;
  }

  if (style === "followup") {
    return `Good day ${recipientName},

I wanted to follow up on my previous message regarding ${service}.

I believe there may still be an opportunity to create value for your business.

Would you be open to a short conversation?

Kind regards,
${userName}`;
  }

  if (style === "casual") {
    return `Hi ${recipientName},

I came across your business and thought I would reach out.

I help businesses with ${service}, and I thought there may be an opportunity to help.

Would you be open to a quick chat?

Thanks,
${userName}`;
  }

  if (style === "direct") {
    return `Hi ${recipientName},

I'll keep this short.

I help businesses with ${service} and thought there may be an opportunity to help.

Would you be open to a short conversation to see whether there is a useful fit?

Regards,
${userName}`;
  }

  return `Good day ${recipientName},

I came across your business and wanted to reach out.

I help businesses with ${service}, and I believe there may be an opportunity to support your business.

Would you be open to a brief conversation?

Kind regards,
${userName}`;
}

function typeText(element, text, speed = 18) {
  if (!element) return;

  element.value = "";

  if (element === messageOutput && copyBtn) {
    copyBtn.disabled = true;
    copyBtn.textContent = "Generating...";
  }

  let index = 0;

  function typeCharacter() {
    if (index < text.length) {
      element.value += text.charAt(index);
      index++;
      setTimeout(typeCharacter, speed);
      return;
    }

    if (element === messageOutput && copyBtn) {
      copyBtn.disabled = false;
      copyBtn.textContent = "Copy Message";
    }
  }

  typeCharacter();
}

async function handleGenerate(index) {
  if (!requireFeature("ai_outreach")) return;

  const lead = leads[index];

  if (!lead || !lead.id) {
    showToast("Lead not found.", "error");
    return;
  }

  const leadId = lead.id;
  const businessName =
    lead.businessName || "Lead";

  const followUp =
    lead.followUpIntelligence || {};

  // Remove an existing outreach modal if one somehow remains.
  const existingModal =
    document.querySelector(".lead-outreach-modal");

  if (existingModal) {
    existingModal.remove();
  }

  const modal =
    document.createElement("div");

  modal.className = "lead-outreach-modal";

  const leadScore =
    lead.aiScore !== null &&
    lead.aiScore !== undefined &&
    String(lead.aiScore).trim() !== ""
      ? lead.aiScore
      : "—";

  const leadStatus =
    lead.status || "Not contacted";

  const recommendedChannel =
    lead.aiBestChannel || "Not yet determined";

  const recommendedApproach =
    lead.aiRecommendedApproach ||
    "No recommended approach available yet.";

  const nextAction =
    lead.aiNextAction ||
    "Review the lead and generate outreach.";

  const opportunity =
    lead.aiOpportunity ||
    "No opportunity analysis available yet.";

  const followUpLabel = (() => {
  const backendLabel =
    String(
      followUp.label || ""
    ).trim();

  if (backendLabel) {
    return backendLabel;
  }

  if (followUp.state === "overdue") {
    return "Follow-up overdue";
  }

  if (followUp.state === "due_today") {
    return "Follow-up due today";
  }

  if (followUp.state === "upcoming") {
    const days =
      Number(
        followUp.daysUntilFollowUp
      );

    if (days === 1) {
      return "Follow-up due tomorrow";
    }

    if (
      Number.isFinite(days) &&
      days > 1
    ) {
      return `Follow-up due in ${days} days`;
    }

    return "Upcoming follow-up";
  }

  if (followUp.state === "scheduled") {
    const days =
      Number(
        followUp.daysUntilFollowUp
      );

    if (
      Number.isFinite(days) &&
      days > 0
    ) {
      return `Follow-up scheduled in ${days} days`;
    }

    return "Follow-up scheduled";
  }

  if (
    followUp.state ===
    "needs_follow_up"
  ) {
    return "Contacted — schedule follow-up";
  }

  if (
    followUp.state ===
    "not_contacted"
  ) {
    return "Not contacted yet";
  }

  if (
    followUp.state ===
    "closed_or_rejected"
  ) {
    return "No active follow-up needed";
  }

  return "No follow-up scheduled";
})();

  const normalizedRecommendedChannel =
    String(recommendedChannel)
      .trim()
      .toLowerCase();

  const emailRecommended =
    normalizedRecommendedChannel.includes("email");

  const whatsappRecommended =
    normalizedRecommendedChannel.includes("whatsapp");

  const linkedinRecommended =
    normalizedRecommendedChannel.includes("linkedin");

  modal.innerHTML = `
    <div class="lead-outreach-backdrop"></div>

    <div
      class="lead-outreach-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leadOutreachTitle"
    >
      <div class="lead-outreach-header">

        <div>
          <span class="lead-outreach-eyebrow">
            SMART OUTREACH
          </span>

          <h2 id="leadOutreachTitle">
            ${escapeHTML(businessName)}
          </h2>

          <p>
            Review the lead intelligence, choose your approach
            and generate personalized outreach.
          </p>
        </div>

        <button
          type="button"
          class="lead-outreach-close"
          aria-label="Close Smart Outreach"
        >
          ×
        </button>

      </div>

      <div class="lead-outreach-body">

        <div class="lead-outreach-context">

          <div class="lead-outreach-stat">
            <span>Lead score</span>
            <strong>
              ${escapeHTML(String(leadScore))}
            </strong>
          </div>

          <div class="lead-outreach-stat">
            <span>Status</span>
            <strong>
              ${escapeHTML(leadStatus)}
            </strong>
          </div>

          <div class="lead-outreach-stat">
            <span>Best channel</span>
            <strong>
              ${escapeHTML(recommendedChannel)}
            </strong>
          </div>

          <div class="lead-outreach-stat">
            <span>Follow-up</span>
            <strong>
              ${escapeHTML(followUpLabel)}
            </strong>
          </div>

        </div>

        <div class="lead-outreach-insight">

          <div class="lead-outreach-section-heading">
            <span>AI Recommendation</span>
          </div>

          <div class="lead-outreach-insight-grid">

            <div class="lead-outreach-insight-card">
              <span>Opportunity</span>

              <p>
                ${escapeHTML(opportunity)}
              </p>
            </div>

            <div class="lead-outreach-insight-card">
              <span>Recommended Approach</span>

              <p>
                ${escapeHTML(recommendedApproach)}
              </p>
            </div>

            <div class="lead-outreach-insight-card">
              <span>Suggested Next Action</span>

              <p>
                ${escapeHTML(nextAction)}
              </p>
            </div>

          </div>

        </div>

        <div class="lead-outreach-settings">

          <div class="lead-outreach-section-heading">
            <span>Message Setup</span>
          </div>

          <div class="lead-outreach-settings-grid">

            <div class="lead-outreach-field">

              <label for="leadOutreachService">
                Service
              </label>

              <input
                type="text"
                id="leadOutreachService"
                value="${escapeHTML(
                  serviceInput?.value?.trim() || ""
                )}"
                placeholder="Use Business Profile services"
              />

            </div>

            <div class="lead-outreach-field">

              <label for="leadOutreachStyle">
                Message Tone
              </label>

              <select id="leadOutreachStyle">

                <option value="">
                  Business Profile tone
                </option>

                <option value="professional">
                  Professional
                </option>

                <option value="friendly">
                  Friendly
                </option>

                <option value="casual">
                  Casual
                </option>

                <option value="confident">
                  Confident
                </option>

                <option value="direct">
                  Direct
                </option>

              </select>

            </div>

          </div>

        </div>

        <div class="lead-outreach-message-section">

          <div class="lead-outreach-section-heading">

            <span>Generated Message</span>

            <small>
              You can edit this message before contacting the lead.
            </small>

          </div>

          <div class="lead-outreach-field">

            <textarea
              id="leadOutreachMessage"
              rows="10"
              placeholder="Your personalized outreach message will appear here..."
            ></textarea>

          </div>

        </div>

      </div>

      <div class="lead-outreach-footer">

        <button
          type="button"
          class="lead-outreach-secondary lead-outreach-regenerate"
        >
          Generate Message
        </button>

        <button
          type="button"
          class="lead-outreach-secondary lead-outreach-copy"
          disabled
        >
          Copy Message
        </button>

        <button
          type="button"
          class="${
            emailRecommended
              ? "lead-outreach-primary"
              : "lead-outreach-secondary"
          } lead-outreach-email"
          disabled
        >
          Email${emailRecommended ? " · Recommended" : ""}
        </button>

        <button
          type="button"
          class="${
            whatsappRecommended
              ? "lead-outreach-primary"
              : "lead-outreach-secondary"
          } lead-outreach-whatsapp"
          disabled
        >
          WhatsApp${whatsappRecommended ? " · Recommended" : ""}
        </button>

        <button
          type="button"
          class="${
            linkedinRecommended
              ? "lead-outreach-primary"
              : "lead-outreach-secondary"
          } lead-outreach-linkedin"
          disabled
        >
          LinkedIn${linkedinRecommended ? " · Recommended" : ""}
        </button>

      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const backdrop =
    modal.querySelector(".lead-outreach-backdrop");

  const dialog =
    modal.querySelector(".lead-outreach-dialog");

  const closeButton =
    modal.querySelector(".lead-outreach-close");

  const generateButton =
    modal.querySelector(".lead-outreach-regenerate");

  const copyButton =
    modal.querySelector(".lead-outreach-copy");

  const emailButton =
    modal.querySelector(".lead-outreach-email");

  const whatsappButton =
    modal.querySelector(".lead-outreach-whatsapp");

  const linkedinButton =
    modal.querySelector(".lead-outreach-linkedin");

  const serviceField =
    modal.querySelector("#leadOutreachService");

  const styleField =
    modal.querySelector("#leadOutreachStyle");

  const messageField =
    modal.querySelector("#leadOutreachMessage");

  // Carry over the currently selected outreach style.
  if (
    messageStyle &&
    Array.from(styleField.options).some(
      (option) =>
        option.value === messageStyle.value
    )
  ) {
    styleField.value = messageStyle.value;
  }

  function closeOutreachModal() {
    document.removeEventListener(
      "keydown",
      handleEscape
    );

    modal.remove();
  }

  function handleEscape(event) {
    if (event.key === "Escape") {
      closeOutreachModal();
    }
  }

  closeButton.addEventListener(
    "click",
    closeOutreachModal
  );

  backdrop.addEventListener(
    "click",
    closeOutreachModal
  );

  document.addEventListener(
    "keydown",
    handleEscape
  );

  // Prevent clicks inside the dialog from behaving
  // like backdrop clicks.
  dialog.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
    }
  );

  async function generateOutreachMessage() {
    generateButton.disabled = true;
    copyButton.disabled = true;
    emailButton.disabled = true;
    whatsappButton.disabled = true;
    linkedinButton.disabled = true;

    generateButton.textContent =
      "Generating...";

    messageField.value =
      "Generating personalized outreach message...";

    showToast(
      `Generating outreach for ${businessName}...`,
      "info"
    );

    try {
      const response = await fetch(
        `${BASE_URL}/api/generate-message`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            businessName:
              businessName,

            contactPerson:
              lead.contactPerson || "",

            service:
              serviceField.value.trim(),

            style:
              styleField.value,

            userName:
              currentUser
                ? currentUser.name
                : "AutoClient User",

            userId:
              currentUser
                ? currentUser.id
                : null,

            leadId:
              leadId,

            status:
              lead.status || "",

            followUpState:
              followUp.state || "",

            daysUntilFollowUp:
              Number.isFinite(
                Number(
                  followUp.daysUntilFollowUp
                )
              )
                ? Number(
                    followUp.daysUntilFollowUp
                  )
                : null,

            aiSummary:
              lead.aiSummary || "",

            aiOpportunity:
              lead.aiOpportunity || "",

            aiRecommendedApproach:
              lead.aiRecommendedApproach || "",

            aiBestChannel:
              lead.aiBestChannel || "",

            aiNextAction:
              lead.aiNextAction || "",

            aiConfidence:
              lead.aiConfidence || "",

            aiScore:
              lead.aiScore !== null &&
              lead.aiScore !== undefined &&
              String(lead.aiScore).trim() !== "" &&
              Number.isFinite(
                Number(lead.aiScore)
              )
                ? Number(lead.aiScore)
                : null
          })
        }
      );

      const data =
        await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Message generation failed"
        );
      }

      messageField.value =
        data.message || "";

      const hasMessage =
        Boolean(messageField.value.trim());

      copyButton.disabled =
        !hasMessage;

      emailButton.disabled =
        !hasMessage;

      whatsappButton.disabled =
        !hasMessage;

      linkedinButton.disabled =
        !hasMessage;

      await fetchActivities();

      showToast(
        "Smart outreach generated.",
        "success"
      );

    } catch (error) {
      console.error(
        "Message error:",
        error
      );

      messageField.value =
        generateMessage(lead);

      const hasMessage =
        Boolean(messageField.value.trim());

      copyButton.disabled =
        !hasMessage;

      emailButton.disabled =
        !hasMessage;

      whatsappButton.disabled =
        !hasMessage;

      linkedinButton.disabled =
        !hasMessage;

      showToast(
        error.message ||
        "Used fallback outreach generator.",
        "warning"
      );

    } finally {
      generateButton.disabled = false;
      generateButton.textContent =
        "Regenerate";
    }
  }

  generateButton.addEventListener(
    "click",
    generateOutreachMessage
  );

  copyButton.addEventListener(
    "click",
    async () => {
      const message =
        messageField.value.trim();

      if (!message) {
        showToast(
          "Generate a message first.",
          "warning"
        );
        return;
      }

      try {
        await navigator.clipboard.writeText(
          message
        );

        copyButton.textContent =
          "Copied ✓";

        showToast(
          "Outreach message copied.",
          "success"
        );

        setTimeout(() => {
          if (
            document.body.contains(copyButton)
          ) {
            copyButton.textContent =
              "Copy Message";
          }
        }, 1800);

      } catch (error) {
        console.error(
          "Copy outreach error:",
          error
        );

        messageField.focus();
        messageField.select();

        showToast(
          "Could not copy automatically. The message has been selected.",
          "warning"
        );
      }
    }
  );

  emailButton.addEventListener(
    "click",
    async () => {
      const message =
        messageField.value.trim();

      if (!message) {
        showToast(
          "Generate a message first.",
          "warning"
        );
        return;
      }

      closeOutreachModal();

      await sendEmail(
        index,
        message
      );
    }
  );

  whatsappButton.addEventListener(
    "click",
    () => {
      const message =
        messageField.value.trim();

      if (!message) {
        showToast(
          "Generate a message first.",
          "warning"
        );
        return;
      }

      sendWhatsApp(
        index,
        message
      );
    }
  );

  linkedinButton.addEventListener(
    "click",
    async () => {
      const message =
        messageField.value.trim();

      if (!message) {
        showToast(
          "Generate a message first.",
          "warning"
        );
        return;
      }

      await sendLinkedIn(
        index,
        message
      );
    }
  );

  // Generate immediately when the modal opens.
  await generateOutreachMessage();
}

async function handleAnalyzeLead(index) {
  const lead = leads[index];

  if (!lead || !lead.id) {
    showToast(
      "Lead could not be analyzed.",
      "error"
    );
    return;
  }

  // Store the ID because fetchLeads() may rebuild/reorder
  // the leads array after the analysis is saved.
  const leadId = lead.id;
  const businessName =
    lead.businessName || "lead";

  try {
    showToast(
      `Analyzing ${businessName}...`,
      "info"
    );

    const response = await fetch(
      `${BASE_URL}/api/analyze-lead/${leadId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const data =
      await readJsonResponse(response);

    if (!response.ok) {
      showToast(
        data.error ||
          "Could not analyze this lead.",
        "error"
      );
      return;
    }

    // Reload the lead from the backend so the UI uses
    // the newly saved AI intelligence.
    await fetchLeads();

    // Find the same lead again instead of relying on its
    // old array position.
    const updatedIndex = leads.findIndex(
      (item) =>
        String(item.id) === String(leadId)
    );

    showToast(
      "Lead Intelligence generated successfully.",
      "success"
    );

    // Reopen the details modal with the refreshed analysis.
    if (updatedIndex !== -1) {
      openLeadDetails(updatedIndex);
    }

  } catch (error) {
    console.error(
      "Lead Intelligence error:",
      error
    );

    showToast(
      "Could not generate Lead Intelligence.",
      "error"
    );
  }
}

async function sendEmail(index, outreachMessage = "") {
  if (!requireFeature("email_integration")) return;

  const lead = leads[index];

  if (!lead) {
    showToast("Lead not found.", "error");
    return;
  }

  if (!currentUser) {
    showToast("Please login first.", "warning");
    return;
  }

  const status =
    lead.status
      ? lead.status.trim().toLowerCase()
      : "";

  const followUpState =
    lead.followUpIntelligence &&
    lead.followUpIntelligence.state
      ? lead.followUpIntelligence.state
      : "";

  const closedStatuses = [
    "closed",
    "lost",
    "rejected"
  ];

  if (
    closedStatuses.includes(status) ||
    followUpState === "closed_or_rejected"
  ) {
    showToast(
      "This lead is closed/rejected. Reopen it before sending outreach.",
      "warning"
    );
    return;
  }

  const existingOverlay =
    document.getElementById("emailComposerOverlay");

  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Prefer the dedicated email field.
  // Fall back to legacy contact data for older leads.
  const dedicatedEmail =
    String(lead.email || "").trim();

  const legacyEmail =
    String(lead.contact || "").trim();

  const defaultEmail =
    dedicatedEmail ||
    (legacyEmail.includes("@")
      ? legacyEmail
      : "");

  const defaultSubject =
    `Quick message for ${
      lead.businessName || "your business"
    }`;

  const generatedMessage =
    String(outreachMessage || "").trim() ||
    generateMessage(lead) ||
    "";

  const overlay = document.createElement("div");

  overlay.id = "emailComposerOverlay";
  overlay.className = "email-composer-overlay";

  overlay.innerHTML = `
    <div
      class="email-composer-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emailComposerTitle"
    >
      <div class="email-composer-header">
        <div>
          <p class="email-composer-eyebrow">
            OUTREACH
          </p>

          <h2 id="emailComposerTitle">
            New Email
          </h2>

          <p class="email-composer-lead">
            To ${escapeHTML(
              lead.businessName || "Lead"
            )}
          </p>
        </div>

        <button
          type="button"
          class="email-composer-close"
          aria-label="Close email composer"
        >
          &times;
        </button>
      </div>

      <div class="email-composer-body">
        <div class="email-composer-field">
          <label for="emailComposerTo">
            Recipient
          </label>

          <input
            id="emailComposerTo"
            type="email"
            autocomplete="email"
            placeholder="name@example.com"
            value="${escapeHTML(defaultEmail)}"
          >
        </div>

        <div class="email-composer-field">
          <label for="emailComposerSubject">
            Subject
          </label>

          <input
            id="emailComposerSubject"
            type="text"
            placeholder="Email subject"
            value="${escapeHTML(defaultSubject)}"
          >
        </div>

        <div class="email-composer-field email-message-field">
          <div class="email-message-label-row">
            <label for="emailComposerMessage">
              Message
            </label>

            <button
              type="button"
              class="email-regenerate-button"
            >
              Regenerate
            </button>
          </div>

          <textarea
            id="emailComposerMessage"
            placeholder="Write your message..."
          >${escapeHTML(generatedMessage)}</textarea>
        </div>
      </div>

      <div class="email-composer-footer">
        <button
          type="button"
          class="email-cancel-button"
        >
          Cancel
        </button>

        <button
          type="button"
          class="email-send-button"
        >
          Send Email
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const modal =
    overlay.querySelector(".email-composer-modal");

  const closeButton =
    overlay.querySelector(".email-composer-close");

  const cancelButton =
    overlay.querySelector(".email-cancel-button");

  const regenerateButton =
    overlay.querySelector(".email-regenerate-button");

  const sendButton =
    overlay.querySelector(".email-send-button");

  const emailInput =
    overlay.querySelector("#emailComposerTo");

  const subjectInput =
    overlay.querySelector("#emailComposerSubject");

  const messageInput =
    overlay.querySelector("#emailComposerMessage");

  let isSending = false;

  const closeComposer = () => {
    document.removeEventListener(
      "keydown",
      handleEscape
    );

    overlay.remove();
  };

  const handleEscape = event => {
    if (
      event.key === "Escape" &&
      !isSending
    ) {
      closeComposer();
    }
  };

  closeButton?.addEventListener(
    "click",
    () => {
      if (!isSending) {
        closeComposer();
      }
    }
  );

  cancelButton?.addEventListener(
    "click",
    () => {
      if (!isSending) {
        closeComposer();
      }
    }
  );

  overlay.addEventListener(
    "click",
    event => {
      if (
        event.target === overlay &&
        !isSending
      ) {
        closeComposer();
      }
    }
  );

  modal?.addEventListener(
    "click",
    event => {
      event.stopPropagation();
    }
  );

  regenerateButton?.addEventListener(
    "click",
    () => {
      const refreshedMessage =
        generateMessage(lead);

      if (!refreshedMessage) {
        showToast(
          "No outreach message could be generated for this lead.",
          "warning"
        );
        return;
      }

      messageInput.value =
        refreshedMessage;

      showToast(
        "Email message regenerated.",
        "success"
      );
    }
  );

  sendButton?.addEventListener(
    "click",
    async () => {
      if (isSending) return;

      const email =
        emailInput.value.trim();

      const subject =
        subjectInput.value.trim();

      const message =
        messageInput.value.trim();

      if (
        !email ||
        !email.includes("@")
      ) {
        showToast(
          "Please enter a valid email address.",
          "warning"
        );

        emailInput.focus();
        return;
      }

      if (!subject) {
        showToast(
          "Please enter an email subject.",
          "warning"
        );

        subjectInput.focus();
        return;
      }

      if (!message) {
        showToast(
          "Please enter an email message.",
          "warning"
        );

        messageInput.focus();
        return;
      }

      isSending = true;

      sendButton.disabled = true;
      sendButton.textContent =
        "Sending...";

      closeButton.disabled = true;
      cancelButton.disabled = true;
      regenerateButton.disabled = true;

      try {
        const sent =
          await sendEmailDirect(
            index,
            email,
            subject,
            message
          );

        if (sent) {
          closeComposer();
          return;
        }

      } finally {
        isSending = false;

        if (
          document.body.contains(sendButton)
        ) {
          sendButton.disabled = false;
          sendButton.textContent =
            "Send Email";

          closeButton.disabled = false;
          cancelButton.disabled = false;
          regenerateButton.disabled = false;
        }
      }
    }
  );

  document.addEventListener(
    "keydown",
    handleEscape
  );

  if (!defaultEmail) {
    emailInput?.focus();
  } else {
    subjectInput?.focus();
  }
}

async function sendEmailDirect(index, email, subject, message) {
  if (!requireFeature("email_integration")) {
    return false;
  }

  const lead = leads[index];

  if (!lead) {
    showToast("Lead not found.", "error");
    return false;
  }

  if (!currentUser) {
    showToast("Please login first.", "warning");
    return false;
  }

  const status =
    lead.status
      ? lead.status.trim().toLowerCase()
      : "";

  const followUpState =
    lead.followUpIntelligence &&
    lead.followUpIntelligence.state
      ? lead.followUpIntelligence.state
      : "";

  const closedStatuses = [
    "closed",
    "lost",
    "rejected"
  ];

  if (
    closedStatuses.includes(status) ||
    followUpState === "closed_or_rejected"
  ) {
    showToast(
      "This lead is closed/rejected. Reopen it before sending outreach.",
      "warning"
    );
    return false;
  }

  const cleanEmail =
    typeof email === "string"
      ? email.trim()
      : "";

  const cleanSubject =
    typeof subject === "string"
      ? subject.trim()
      : "";

  const cleanMessage =
    typeof message === "string"
      ? message.trim()
      : "";

  if (
    !cleanEmail ||
    !cleanEmail.includes("@")
  ) {
    showToast(
      "Please enter a valid email address.",
      "warning"
    );
    return false;
  }

  if (!cleanSubject) {
    showToast(
      "Please enter an email subject.",
      "warning"
    );
    return false;
  }

  if (!cleanMessage) {
    showToast(
      "Please enter an email message.",
      "warning"
    );
    return false;
  }

  try {
    showToast(
      "Sending email...",
      "info"
    );

    const response = await fetch(
      SEND_EMAIL_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: currentUser.id,
          leadId: lead.id,
          businessName: lead.businessName,
          to: cleanEmail,
          subject: cleanSubject,
          message: cleanMessage
        })
      }
    );

    const data =
      await readJsonResponse(response);

    if (!response.ok) {
      console.error(
        "Email send error:",
        data
      );

      alert(
        data.error ||
        "Email failed. Check server logs."
      );

      showToast(
        data.error ||
        "Email failed to send.",
        "error"
      );

      return false;
    }

    // --------------------------------------------------
    // Email succeeded.
    //
    // The backend has now updated:
    // - lastContacted
    // - New -> Contacted
    //
    // Reload the leads so the CRM immediately receives
    // the new status and follow-up intelligence.
    // --------------------------------------------------

    await fetchLeads();

    // Refresh the activity timeline as well.
    await fetchActivities();

    showToast(
      "Email sent successfully.",
      "success"
    );

    return true;

  } catch (error) {
    console.error(
      "Send email connection error:",
      error
    );

    alert(
      "Could not connect to email backend."
    );

    showToast(
      "Could not connect to email backend.",
      "error"
    );

    return false;
  }
}
function sendWhatsApp(
  index,
  outreachMessage = ""
) {
  const lead = leads[index];

  if (!lead) {
    showToast(
      "Lead could not be found.",
      "error"
    );
    return false;
  }

  const rawPhone =
    String(
      lead.phone || ""
    ).trim();

  if (!rawPhone) {
    showToast(
      "Add a phone / WhatsApp number to this lead first.",
      "warning"
    );
    return false;
  }

  const phone =
    rawPhone.replace(/\D/g, "");

  if (!phone) {
    showToast(
      "This lead does not have a valid phone number.",
      "warning"
    );
    return false;
  }

  const message =
    String(
      outreachMessage || ""
    ).trim() ||
    generateMessage(lead) ||
    "";

  if (!message) {
    showToast(
      "No outreach message is available.",
      "warning"
    );
    return false;
  }

  const encodedMessage =
    encodeURIComponent(message);

  const whatsappURL =
    `https://wa.me/${phone}?text=${encodedMessage}`;

  window.open(
    whatsappURL,
    "_blank",
    "noopener,noreferrer"
  );

  logActivity(
    lead.id,
    "WhatsApp Outreach Opened",
    `WhatsApp outreach opened for ${lead.businessName}.`
  );

  showToast(
    "WhatsApp opened with your message.",
    "success"
  );

  // AutoClient confirmation modal.
  showContactConfirmation(
    index,
    "WhatsApp"
  );

  return true;
}


async function sendLinkedIn(
  index,
  outreachMessage = ""
) {
  const lead = leads[index];

  if (!lead) {
    showToast(
      "Lead could not be found.",
      "error"
    );
    return false;
  }

  const linkedInUrl =
    normalizeUrl(
      String(
        lead.linkedin || ""
      ).trim()
    );

  if (!linkedInUrl) {
    showToast(
      "Add a LinkedIn profile to this lead first.",
      "warning"
    );
    return false;
  }

  if (
    !linkedInUrl
      .toLowerCase()
      .includes("linkedin.com/")
  ) {
    showToast(
      "This lead does not have a valid LinkedIn URL.",
      "warning"
    );
    return false;
  }

  const message =
    String(
      outreachMessage || ""
    ).trim() ||
    generateMessage(lead) ||
    "";

  if (!message) {
    showToast(
      "No outreach message is available.",
      "warning"
    );
    return false;
  }

  let copied = false;

  try {
    await navigator.clipboard.writeText(
      message
    );

    copied = true;

  } catch (error) {
    console.error(
      "Could not copy LinkedIn message:",
      error
    );
  }

  window.open(
    linkedInUrl,
    "_blank",
    "noopener,noreferrer"
  );

  logActivity(
    lead.id,
    "LinkedIn Outreach Opened",
    `LinkedIn profile opened for ${lead.businessName}.`
  );

  if (copied) {
    showToast(
      "LinkedIn opened. Your message was copied.",
      "success"
    );
  } else {
    showToast(
      "LinkedIn opened, but the message could not be copied.",
      "warning"
    );
  }

  // AutoClient confirmation modal.
  showContactConfirmation(
    index,
    "LinkedIn"
  );

  return true;
}
if (copyBtn && messageOutput) {
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
}

function renderLeadIdeas(ideas) {
  leadIdeas.innerHTML = "";

  ideas.forEach(idea => {
    const div = document.createElement("div");
    div.className = "lead-idea-card";

    const googleSearchUrl =
      `https://www.google.com/search?q=${encodeURIComponent(idea.businessName || "")}`;

    const info = document.createElement("div");
    info.className = "lead-idea-info";

    const businessName = document.createElement("strong");
    businessName.textContent = idea.businessName || "Untitled Lead";

    const notes = document.createElement("p");
    notes.textContent = idea.notes || "";

    info.appendChild(businessName);
    info.appendChild(notes);

    const actions = document.createElement("div");
    actions.className = "lead-idea-actions";

    const searchLink = document.createElement("a");
    searchLink.href = googleSearchUrl;
    searchLink.target = "_blank";
    searchLink.rel = "noopener noreferrer";
    searchLink.className = "google-search-btn";
    searchLink.textContent = "Search";

    const addButton = document.createElement("button");
    addButton.className = "add-idea-btn";
    addButton.textContent = "+ Add";

    actions.appendChild(searchLink);
    actions.appendChild(addButton);

    div.appendChild(info);
    div.appendChild(actions);

    addButton.addEventListener("click", async () => {
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
    const statsRes = await fetch(
      `${BASE_URL}/api/admin/stats?userId=${currentUser.id}`
    );

    const usersRes = await fetch(
      `${BASE_URL}/api/admin/users?userId=${currentUser.id}`
    );

    const leadsRes = await fetch(
      `${BASE_URL}/api/admin/leads?userId=${currentUser.id}`
    );

    const stats = await readJsonResponse(statsRes);
    const users = await readJsonResponse(usersRes);
    const allLeads = await readJsonResponse(leadsRes);

    if (!statsRes.ok || !usersRes.ok || !leadsRes.ok) {
      throw new Error("Admin request failed");
    }

    adminTotalUsers.textContent = stats.totalUsers;
    adminTotalLeads.textContent = stats.totalLeads;
    adminNewLeads.textContent = stats.newLeads;
    adminQualifiedLeads.textContent = stats.qualifiedLeads;
    adminClosedLeads.textContent = stats.closedLeads;

    adminUsersList.innerHTML = "";

    if (!users.length) {
      const emptyRow = document.createElement("div");
      emptyRow.className = "table-row";

      const message = document.createElement("strong");
      message.textContent = "No users found";

      emptyRow.appendChild(message);
      adminUsersList.appendChild(emptyRow);
    }

    users.forEach(user => {
      const div = document.createElement("div");
      div.className = "table-row";

      const name = document.createElement("strong");
      name.textContent = user.name || "Unknown User";

      const email = document.createElement("span");
      email.textContent = user.email || "No email";

      const plan = document.createElement("span");
      plan.textContent =
        `Plan: ${(user.plan || "free").toUpperCase()} • ${
          user.subscription_status ||
          user.subscriptionstatus ||
          "inactive"
        }`;

      const joined = document.createElement("span");
      joined.textContent =
        `Joined: ${user.createdAt || user.createdat || "N/A"}`;

      const betaUntil =
        user.beta_pro_until ||
        user.betaprountil ||
        "";

      const betaActive =
        betaUntil &&
        new Date(betaUntil.replace(" ", "T")) > new Date();

      const betaStatus = document.createElement("span");

      if (betaActive) {
        betaStatus.textContent =
          `Beta Pro until: ${betaUntil}`;
      } else {
        betaStatus.textContent = "Beta Pro: Not active";
      }

      const betaButton = document.createElement("button");
      betaButton.type = "button";
      betaButton.className = "btn secondary-btn";

      if (betaActive) {
        betaButton.textContent = "Revoke Beta Pro";

        betaButton.addEventListener("click", async () => {
          try {
            betaButton.disabled = true;
            betaButton.textContent = "Revoking...";

            const response = await fetch(
              `${BASE_URL}/api/admin/users/${user.id}/revoke-beta`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                }
              }
            );

            const data = await readJsonResponse(response);

            if (!response.ok) {
              throw new Error(
                data.error || "Could not revoke beta access"
              );
            }

            showToast(
              "Beta Pro access revoked",
              "success"
            );

            await loadAdminDashboard();
          } catch (error) {
            console.error("Revoke beta error:", error);

            showToast(
              error.message || "Could not revoke beta access",
              "error"
            );

            betaButton.disabled = false;
            betaButton.textContent = "Revoke Beta Pro";
          }
        });
      } else {
        betaButton.textContent = "Grant Beta Pro";

        betaButton.addEventListener("click", async () => {
          try {
            betaButton.disabled = true;
            betaButton.textContent = "Granting...";

            const response = await fetch(
              `${BASE_URL}/api/admin/users/${user.id}/grant-beta`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  days: 30
                })
              }
            );

            const data = await readJsonResponse(response);

            if (!response.ok) {
              throw new Error(
                data.error || "Could not grant beta access"
              );
            }

            showToast(
              `Beta Pro granted until ${data.betaProUntil}`,
              "success"
            );

            await loadAdminDashboard();
          } catch (error) {
            console.error("Grant beta error:", error);

            showToast(
              error.message || "Could not grant beta access",
              "error"
            );

            betaButton.disabled = false;
            betaButton.textContent = "Grant Beta Pro";
          }
        });
      }

      div.appendChild(name);
      div.appendChild(email);
      div.appendChild(plan);
      div.appendChild(joined);
      div.appendChild(betaStatus);
      div.appendChild(betaButton);

      adminUsersList.appendChild(div);
    });

    adminLeadsList.innerHTML = "";

    if (!allLeads.length) {
      const emptyRow = document.createElement("div");
      emptyRow.className = "table-row";

      const message = document.createElement("strong");
      message.textContent = "No leads found";

      emptyRow.appendChild(message);
      adminLeadsList.appendChild(emptyRow);
    }

    allLeads
      .slice(0, 30)
      .map(normalizeLead)
      .forEach(lead => {
        const div = document.createElement("div");
        div.className = "table-row";

        const businessName = document.createElement("strong");
        businessName.textContent =
          lead.businessName || "Unnamed Lead";

        // Normalize legacy statuses for the Admin display.
        const rawStatus =
          String(lead.status || "New")
            .trim()
            .toLowerCase();

        let displayStatus =
          lead.status || "New";

        if (
          [
            "interested",
            "proposal",
            "negotiation"
          ].includes(rawStatus)
        ) {
          displayStatus = "Qualified";
        } else if (
          [
            "replied",
            "follow_up",
            "follow up"
          ].includes(rawStatus)
        ) {
          displayStatus = "Follow-up";
        }

        const status = document.createElement("span");
        status.textContent =
          `${displayStatus} • ${lead.priority || "Cold"} Lead`;

        const owner = document.createElement("span");
        owner.textContent =
          `Owner: ${lead.ownerName || "Unknown"} — ${
            lead.ownerEmail || "N/A"
          }`;

        div.appendChild(businessName);
        div.appendChild(status);
        div.appendChild(owner);

        adminLeadsList.appendChild(div);
      });

    showToast(
      "Admin dashboard refreshed.",
      "success"
    );
  } catch (error) {
    console.error(
      "Admin dashboard error:",
      error
    );

    showToast(
      "Could not load admin dashboard.",
      "error"
    );
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
  "Follow-up": leads.filter(lead => lead.status === "Follow-up").length,
  Qualified: leads.filter(
    lead => ["Qualified", "Interested"].includes(lead.status)
  ).length,
  Closed: leads.filter(lead => lead.status === "Closed").length
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
        "Follow-up",
        "Qualified",
        "Closed",
        "Overdue"
      ],
      datasets: [{
        data: [
          leads.length,
          leadCounts.Contacted,
          leadCounts["Follow-up"],
          leadCounts.Qualified,
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
    "Follow-up": document.getElementById("kanban-follow-up"),
    Qualified: document.getElementById("kanban-qualified"),
    Closed: document.getElementById("kanban-closed")
  };

  // Convert older AutoClient statuses into the new 5-stage pipeline.
  function getPipelineStatus(status) {
    const value = String(status || "")
      .trim()
      .toLowerCase();

    if (!value || value === "new") {
      return "New";
    }

    if (value === "contacted") {
      return "Contacted";
    }

    if (
      value === "follow-up" ||
      value === "follow_up" ||
      value === "follow up" ||
      value === "replied"
    ) {
      return "Follow-up";
    }

    if (
      value === "qualified" ||
      value === "interested" ||
      value === "proposal" ||
      value === "negotiation"
    ) {
      return "Qualified";
    }

    if (value === "closed") {
      return "Closed";
    }

    // Rejected/Lost leads are terminal but are not part
    // of the active 5-stage sales pipeline.
    if (
      value === "rejected" ||
      value === "lost"
    ) {
      return null;
    }

    // Unknown statuses should not be falsely shown as New.
    return null;
  }

  const stageCounts = {
    New: 0,
    Contacted: 0,
    "Follow-up": 0,
    Qualified: 0,
    Closed: 0
  };

  leads.forEach((lead) => {
    const status =
      getPipelineStatus(lead.status);

    if (!status) {
      return;
    }

    stageCounts[status]++;
  });

  const stageTitles = {
    New: document.querySelector(".new-title"),
    Contacted: document.querySelector(".contacted-title"),
    "Follow-up": document.querySelector(".follow-up-title"),
    Qualified: document.querySelector(".qualified-title"),
    Closed: document.querySelector(".closed-title")
  };

  Object.entries(stageTitles).forEach(
    ([status, element]) => {
      if (element) {
        element.textContent =
          `${status} · ${stageCounts[status]}`;
      }
    }
  );

  Object.values(columns).forEach((column) => {
    if (column) {
      column.innerHTML = "";
    }
  });

  if (!currentPlan.features.kanban) {
    const kanbanBoard =
      document.querySelector(".kanban-board");

    if (kanbanBoard) {
      kanbanBoard.innerHTML = `
        <div class="pipeline-locked-preview">
          <div class="pipeline-preview-icon">
            🔒
          </div>

          <div class="pipeline-preview-content">
            <p class="eyebrow">
              Pro CRM Feature
            </p>

            <h3>
              Unlock the Visual Sales Pipeline
            </h3>

            <p>
              Drag leads through your sales stages,
              manage your workflow visually,
              and keep opportunities moving from
              New to Closed.
            </p>

            <div class="pipeline-preview-stages">
              <span>New</span>
              <span>Contacted</span>
              <span>Follow-up</span>
              <span>Qualified</span>
              <span>Closed</span>
            </div>
          </div>

          <button
            class="primary-btn pipeline-upgrade-btn"
          >
            Upgrade to Pro
          </button>
        </div>
      `;

      const pipelineUpgradeButton =
        kanbanBoard.querySelector(
          ".pipeline-upgrade-btn"
        );

      if (pipelineUpgradeButton) {
        pipelineUpgradeButton.addEventListener(
          "click",
          () => {
            showPage("settingsPage");
          }
        );
      }
    }

    return;
  }

  leads.forEach((lead, index) => {
    const status =
      getPipelineStatus(lead.status);

    // Do not place terminal/unknown legacy statuses
    // into the wrong pipeline column.
    if (!status) {
      return;
    }

    const score = getLeadScore(lead);

    const safeScoreLevel =
      ["hot", "warm", "cold"].includes(
        score.level
      )
        ? score.level
        : "cold";

    const card =
      document.createElement("div");

    card.className = "kanban-card";
    card.draggable = true;
    card.dataset.index = index;

    const businessName =
      document.createElement("h4");

    businessName.textContent =
      lead.businessName || "Unnamed Lead";

    const contact =
      document.createElement("p");

    contact.textContent =
      lead.contact ||
      lead.email ||
      lead.phone ||
      "No contact info";

    const priority =
      document.createElement("span");

    priority.className =
      "kanban-priority";

    priority.textContent =
      `${lead.priority || "Cold"} Lead`;

    const scoreBadge =
      document.createElement("span");

    scoreBadge.className =
      `lead-score-badge score-${safeScoreLevel}`;

    scoreBadge.textContent =
      score.label || "";

    card.appendChild(businessName);
    card.appendChild(contact);
    card.appendChild(priority);
    card.appendChild(scoreBadge);

    card.addEventListener(
      "dragstart",
      function () {
        card.classList.add("dragging");
      }
    );

    card.addEventListener(
      "dragend",
      function () {
        card.classList.remove("dragging");
      }
    );

    if (columns[status]) {
      columns[status].appendChild(card);
    }
  });

  document
    .querySelectorAll(".kanban-dropzone")
    .forEach((zone) => {
      zone.addEventListener(
        "dragover",
        (event) => {
          event.preventDefault();
        }
      );

      zone.addEventListener(
        "drop",
        async function () {
          const draggedCard =
            document.querySelector(
              ".dragging"
            );

          if (!draggedCard) {
            return;
          }

          const leadIndex =
            Number(
              draggedCard.dataset.index
            );

          const lead =
            leads[leadIndex];

          if (!lead) {
            showToast(
              "Lead could not be found.",
              "error"
            );
            return;
          }

          const statusByZone = {
            "kanban-new": "New",
            "kanban-contacted": "Contacted",
            "kanban-follow-up": "Follow-up",
            "kanban-qualified": "Qualified",
            "kanban-closed": "Closed"
          };

          const newStatus =
            statusByZone[zone.id];

          if (!newStatus) {
            return;
          }

          const currentPipelineStatus =
            getPipelineStatus(lead.status);

          if (
            currentPipelineStatus === newStatus &&
            lead.status === newStatus
          ) {
            return;
          }

          await updateLead(
            lead.id,
            {
              ...lead,
              userId: currentUser.id,
              status: newStatus
            }
          );

          showToast(
            `Lead moved to ${newStatus}.`,
            "success"
          );
        }
      );
    });
}

const upgradeProBtn = document.getElementById("upgradeProBtn");
const upgradeAgencyBtn = document.getElementById("upgradeAgencyBtn");
const manageBillingBtn = document.getElementById("manageBillingBtn");

if (upgradeProBtn) {
  upgradeProBtn.addEventListener("click", () => startCheckout("pro"));
}

if (upgradeAgencyBtn) {
  upgradeAgencyBtn.addEventListener("click", () => {
    showToast("Agency plan is coming soon.", "info");
  });
}

if (manageBillingBtn) {
  manageBillingBtn.addEventListener("click", openBillingPortal);
}

injectSmartCRMStyles();
applySavedTheme();
checkAuth();

// Close the mobile lead "More" menu when clicking outside it
document.addEventListener("click", (event) => {
  document.querySelectorAll(".lead-more-menu[open]").forEach((menu) => {
    if (!menu.contains(event.target)) {
      menu.removeAttribute("open");
    }
  });
});
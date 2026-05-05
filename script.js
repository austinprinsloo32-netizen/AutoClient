const BASE_URL = "https://autoclient-cim7.onrender.com";
const API_URL = `${BASE_URL}/api/leads`;

const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");

const findLeadsBtn = document.getElementById("findLeadsBtn");
const leadIdeas = document.getElementById("leadIdeas");
const leadIndustry = document.getElementById("leadIndustry");
const leadLocation = document.getElementById("leadLocation");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const logoutBtn = document.getElementById("logoutBtn");
const userDisplay = document.getElementById("userDisplay");

const leadForm = document.getElementById("leadForm");
const leadList = document.getElementById("leadList");

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

let leads = [];
let editIndex = null;
let currentUser = JSON.parse(localStorage.getItem("autoclient_user")) || null;

function showAuth() {
  authSection.style.display = "grid";
  appSection.style.display = "none";
  logoutBtn.style.display = "none";
  userDisplay.textContent = "Not logged in";
}

function showApp() {
  authSection.style.display = "none";
  appSection.style.display = "grid";
  logoutBtn.style.display = "inline-block";
  userDisplay.textContent = currentUser ? `Logged in: ${currentUser.name}` : "Logged in";
  fetchLeads();
}

function checkAuth() {
  if (currentUser) {
    showApp();
  } else {
    showAuth();
  }
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
});

async function fetchLeads() {
  if (!currentUser) return;

  try {
    const response = await fetch(`${API_URL}?userId=${currentUser.id}`);
    const data = await response.json();

    if (!response.ok) {
      console.error("Fetch leads error:", data);
      leadList.innerHTML = `<p>Could not load leads.</p>`;
      return;
    }

    leads = data;
    renderLeads();
  } catch (error) {
    console.error("Fetch leads error:", error);
    leadList.innerHTML = `<p>Could not connect to backend.</p>`;
  }
}

function sendLinkedIn(index) {
  const lead = leads[index];
  if (!lead) return;

  const message = generateMessage(lead);

  // Copy message
  navigator.clipboard.writeText(message);

  // Open LinkedIn search
  const searchUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(lead.businessName)}`;

  window.open(searchUrl, "_blank");

  alert("Message copied! Paste it into LinkedIn chat.");
}

function updateDashboard() {
  totalLeads.textContent = leads.length;
  newLeads.textContent = leads.filter(lead => lead.status === "New").length;
  contactedLeads.textContent = leads.filter(lead => lead.status === "Contacted").length;
  interestedLeads.textContent = leads.filter(lead => lead.status === "Interested").length;
  closedLeads.textContent = leads.filter(lead => lead.status === "Closed").length;
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
        <a href="${googleSearchUrl}" target="_blank" class="google-search-btn">Search Google</a>
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

function renderLeads() {
  if (!leadList) return;

  leadList.innerHTML = "";
  updateDashboard();

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
    div.className = "lead-card";

    div.innerHTML = `
      <h3>${lead.businessName}</h3>
      <p><strong>Priority:</strong> ${lead.priority || "Cold"}</p>
      <p><strong>Link:</strong> ${lead.link ? `<a href="${lead.link}" target="_blank">Open</a>` : "N/A"}</p>
      <p><strong>Contact:</strong> ${lead.contact || "N/A"}</p>
      <p><strong>Notes:</strong> ${lead.notes || "None"}</p>
      <p><strong>Added:</strong> ${lead.createdAt || "N/A"}</p>

      <label>Status:</label>
      <select onchange="updateStatus(${index}, this.value)">
        <option ${lead.status === "New" ? "selected" : ""}>New</option>
        <option ${lead.status === "Contacted" ? "selected" : ""}>Contacted</option>
        <option ${lead.status === "Replied" ? "selected" : ""}>Replied</option>
        <option ${lead.status === "Interested" ? "selected" : ""}>Interested</option>
        <option ${lead.status === "Closed" ? "selected" : ""}>Closed</option>
        <option ${lead.status === "Rejected" ? "selected" : ""}>Rejected</option>
      </select>

      <div class="lead-actions">
        <button onclick="handleGenerate(${index})">Generate Message</button>
        <button class="whatsapp-btn" onclick="sendWhatsApp(${index})">WhatsApp</button>
        <button class="linkedin-btn" onclick="sendLinkedIn(${index})">LinkedIn</button>
        <button onclick="editLead(${index})">Edit</button>
        <button onclick="markContacted(${index})">Mark Contacted</button>
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
          createdAt: leads[editIndex].createdAt
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
    alert("Could not save lead. Make sure backend is running.");
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
  leadForm.scrollIntoView({ behavior: "smooth" });
}

async function deleteLead(index) {
  const confirmDelete = confirm("Delete this lead?");
  if (!confirmDelete) return;

  const leadId = leads[index].id;

  try {
    await fetch(`${API_URL}/${leadId}`, { method: "DELETE" });
    fetchLeads();
  } catch (error) {
    console.error("Delete lead error:", error);
    alert("Could not delete lead. Make sure backend is running.");
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

async function handleGenerate(index) {
  const lead = leads[index];

  messageOutput.value = "Generating message...";
  messageOutput.scrollIntoView({ behavior: "smooth" });

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
  if (!lead) return;

  const message = generateMessage(lead);
  const encodedMessage = encodeURIComponent(message);

  const phone = (lead.contact || "").replace(/\D/g, "");
  const whatsappURL = phone
    ? `https://wa.me/${phone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;

  window.open(whatsappURL, "_blank");
}

copyBtn.addEventListener("click", async function () {
  if (!messageOutput.value.trim()) {
    copyBtn.textContent = "No message";
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
  setTimeout(() => {
    copyBtn.textContent = "Copy Message";
  }, 1500);
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

checkAuth();
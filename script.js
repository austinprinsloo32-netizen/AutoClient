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

let leads = JSON.parse(localStorage.getItem("autoclient_leads")) || [];
let editIndex = null;

function saveLeads() {
  localStorage.setItem("autoclient_leads", JSON.stringify(leads));
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

  if (style === "formal") {
    return `Good day ${lead.businessName},

I hope you are well.

${personalLine}

I help businesses with ${service}. I believe there may be an opportunity to support your business by improving visibility, attracting more customers, or saving valuable time.

Would you be open to a brief conversation this week?

Kind regards`;
  }

  if (style === "casual") {
    return `Hi ${lead.businessName},

I came across your business and thought I would reach out.

${personalLine}

I help businesses with ${service}, and I think I could possibly help you get better results.

Would you be open to a quick chat?

Thanks`;
  }

  if (style === "direct") {
    return `Hi ${lead.businessName},

I’ll keep this short.

${personalLine}

I help businesses with ${service}. If you want more clients, a better online presence, or a smoother system, I can help.

Are you open to discussing how I could help your business grow?

Regards`;
  }

  if (style === "followup") {
    return `Hi ${lead.businessName},

Just following up on my previous message.

I help businesses with ${service}, and I still think there may be a good opportunity to help your business improve results.

Would now be a better time for a quick conversation?

Kind regards`;
  }
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

function renderLeads() {
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
      <p><strong>Link:</strong> ${lead.link || "N/A"}</p>
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
        <button onclick="editLead(${index})">Edit</button>
        <button onclick="markContacted(${index})">Mark Contacted</button>
        <button class="delete-btn" onclick="deleteLead(${index})">Delete</button>
      </div>
    `;

    leadList.appendChild(div);
  });
}

leadForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const businessName = document.getElementById("businessName").value.trim();
  const leadLink = document.getElementById("leadLink").value.trim();
  const contactInfo = document.getElementById("contactInfo").value.trim();
  const priority = document.getElementById("priority").value;
  const notes = document.getElementById("notes").value.trim();

  const leadData = {
    businessName,
    link: leadLink,
    contact: contactInfo,
    priority,
    notes,
    status: "New",
    createdAt: new Date().toLocaleString()
  };

  if (editIndex !== null) {
    leads[editIndex] = {
      ...leads[editIndex],
      ...leadData,
      status: leads[editIndex].status,
      createdAt: leads[editIndex].createdAt
    };

    editIndex = null;
    leadForm.querySelector("button[type='submit']").textContent = "Add Lead";
  } else {
    leads.push(leadData);
  }

  saveLeads();
  renderLeads();
  leadForm.reset();
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

function deleteLead(index) {
  const confirmDelete = confirm("Delete this lead?");
  if (!confirmDelete) return;

  leads.splice(index, 1);
  saveLeads();
  renderLeads();
}

function updateStatus(index, newStatus) {
  leads[index].status = newStatus;
  saveLeads();
  renderLeads();
}

function markContacted(index) {
  leads[index].status = "Contacted";
  saveLeads();
  renderLeads();
}

function handleGenerate(index) {
  const message = generateMessage(leads[index]);
  messageOutput.value = message;
  messageOutput.scrollIntoView({ behavior: "smooth" });
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

renderLeads();
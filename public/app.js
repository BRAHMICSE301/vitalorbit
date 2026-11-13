const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const state = { crew: [], incidents: [], telemetry: [], messages: [] };
const labels = { overview: "OVERVIEW", crew: "CREW ROSTER", telemetry: "TELEMETRY", incidents: "INCIDENT REGISTER", messages: "MISSION NOTES", mission: "MISSION CONTROL" };

function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => node.classList.remove("show"), 2600);
}
async function api(url, options = {}) {
  const response = await fetch("/api" + url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The server request failed.");
  return data;
}
function dateTime(value) {
  return new Date(value).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function statusClass(value) {
  if (value === "High" || value === "Urgent" || value === "Open") return "orange";
  if (value === "Resolved" || value === "On duty") return "";
  return "gray";
}
function navigate(view) {
  if (!labels[view]) return;
  $$(".view").forEach(section => section.classList.toggle("active", section.id === "view-" + view));
  $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("#currentSection").textContent = labels[view];
  $("#rail").classList.remove("open");
}
async function checkConnection() {
  try {
    const result = await api("/health");
    const online = result.database === "connected";
    $("#connectionDot").classList.toggle("online", online);
    $("#connectionText").textContent = online ? "DATABASE CONNECTED" : "DATABASE OFFLINE";
  } catch {
    $("#connectionText").textContent = "SERVER UNAVAILABLE";
    $("#connectionDot").classList.remove("online");
  }
}
async function loadCrew() {
  state.crew = await api("/crew");
  renderCrew();
  $("#telemetryCrew").innerHTML = '<option value="">Select crew member</option>' + state.crew.map(person => '<option value="' + person._id + '">' + safe(person.name) + ' · ' + safe(person.callSign) + '</option>').join("");
}
function renderCrew() {
  $("#crewGrid").innerHTML = state.crew.length ? state.crew.map(person => `
    <article class="crew-card"><div class="crew-card-top"><div class="person-chip">${safe(person.name.split(" ").map(part => part[0]).slice(0,2).join(""))}</div><div><h3>${safe(person.name)}</h3><div class="role">${safe(person.role)}</div></div></div>
    <div class="crew-detail"><span>CALL SIGN</span><b>${safe(person.callSign)}</b></div><div class="crew-detail"><span>ASSIGNMENT STATUS</span><span class="status ${statusClass(person.status)}">${safe(person.status)}</span></div></article>`).join("") : '<p class="empty">No crew profiles have been added yet.</p>';
  $("#overviewCrew").innerHTML = state.crew.slice(0,4).map(person => `
    <div class="list-row"><div class="person-line"><div class="person-chip">${safe(person.name.split(" ").map(part=>part[0]).slice(0,2).join(""))}</div><div class="list-main"><b>${safe(person.name)}</b><small>${safe(person.role)} · ${safe(person.callSign)}</small></div></div><span class="status ${statusClass(person.status)}">${safe(person.status)}</span></div>`).join("") || '<p class="empty">No crew members found.</p>';
}
async function loadTelemetry() {
  state.telemetry = await api("/telemetry?limit=30");
  $("#telemetryRows").innerHTML = state.telemetry.length ? state.telemetry.map(record => `
    <tr><td>${dateTime(record.recordedAt)}</td><td>${safe(record.crewId?.name || "Unknown")}</td><td>${record.heartRate} bpm</td><td>${record.oxygen}%</td><td>${record.temperature.toFixed(1)} °C</td><td>${record.respiration} /min</td></tr>`).join("") : '<tr><td colspan="6" class="empty">No telemetry records have been saved.</td></tr>';
}
async function loadIncidents() {
  state.incidents = await api("/incidents");
  const overview = state.incidents.slice(0,4);
  $("#overviewIncidents").innerHTML = overview.length ? overview.map(item => `
    <div class="list-row"><div class="list-main"><b>${safe(item.title)}</b><small>${dateTime(item.createdAt)} · ${safe(item.category)}</small></div><span class="status ${statusClass(item.severity)}">${safe(item.severity)}</span></div>`).join("") : '<p class="empty">No incidents recorded. That is the preferred state of any mission register.</p>';
  $("#incidentRows").innerHTML = state.incidents.length ? state.incidents.map(item => `
    <tr><td>${dateTime(item.createdAt)}</td><td><b>${safe(item.title)}</b><br><small>${safe(item.crewName)}</small></td><td>${safe(item.category)}</td><td><span class="status ${statusClass(item.severity)}">${safe(item.severity)}</span></td><td><span class="status ${statusClass(item.status)}">${safe(item.status)}</span></td><td><select aria-label="Update incident status" data-incident="${item._id}"><option ${item.status==="Open"?"selected":""}>Open</option><option ${item.status==="Monitoring"?"selected":""}>Monitoring</option><option ${item.status==="Resolved"?"selected":""}>Resolved</option></select></td></tr>`).join("") : '<tr><td colspan="6" class="empty">No incidents have been registered.</td></tr>';
}
async function loadMessages() {
  state.messages = await api("/messages");
  $("#messageList").innerHTML = state.messages.length ? state.messages.map(message => `
    <article class="message-card"><div class="message-meta"><span>${safe(message.sender)} · ${dateTime(message.createdAt)}</span><span class="status ${statusClass(message.priority)}">${safe(message.priority)}</span></div><p>${safe(message.body)}</p></article>`).join("") : '<p class="empty">No mission notes saved yet.</p>';
}
async function loadSummary() {
  const summary = await api("/summary");
  $("#crewCount").textContent = summary.crewCount;
  $("#incidentCount").textContent = summary.activeIncidents;
  if (summary.latestReading) {
    const reading = summary.latestReading;
    $("#latestHr").textContent = reading.heartRate;
    $("#latestO2").textContent = reading.oxygen + "%";
    $("#latestHrMeta").textContent = (reading.crewId?.name || "Crew member") + " · latest record";
    $("#latestO2Meta").textContent = dateTime(reading.recordedAt);
  } else {
    $("#latestHr").textContent = "—";
    $("#latestO2").textContent = "—";
  }
}
function renderMissionTimeline() {
  const events = [
    ...state.incidents.map(item => ({ type: "INCIDENT", title: item.title, detail: item.category + " · " + item.severity + " · " + item.status, date: item.createdAt, tone: "incident" })),
    ...state.telemetry.map(item => ({ type: "TELEMETRY", title: "Crew telemetry recorded", detail: (item.crewId?.name || "Crew member") + " · HR " + item.heartRate + " bpm · O₂ " + item.oxygen + "%", date: item.recordedAt || item.createdAt, tone: "telemetry" })),
    ...state.messages.map(item => ({ type: "MISSION NOTE", title: item.sender, detail: item.body, date: item.createdAt, tone: "note" })),
    ...state.crew.map(item => ({ type: "CREW", title: item.name + " joined the roster", detail: item.role + " · " + item.callSign, date: item.createdAt, tone: "crew" }))
  ].filter(item => item.date).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,20);
  const target = $("#missionTimeline");
  if (!target) return;
  target.innerHTML = events.length ? events.map(item => `
    <div class="timeline-item"><span class="timeline-marker ${item.tone}"></span><div class="timeline-copy"><div class="timeline-meta"><span>${safe(item.type)}</span><time>${dateTime(item.date)}</time></div><b>${safe(item.title)}</b><p>${safe(item.detail)}</p></div></div>`).join("") : '<p class="empty">No mission activity has been recorded yet.</p>';
}
async function refreshAll() {
  await Promise.all([loadCrew(), loadTelemetry(), loadIncidents(), loadMessages(), loadSummary()]);
  renderMissionTimeline();
  await checkConnection();
}
$("#navigation").addEventListener("click", event => {
  const button = event.target.closest("[data-view]");
  if (button) navigate(button.dataset.view);
});
$$("[data-jump]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.jump)));
$("#menuButton").addEventListener("click", () => $("#rail").classList.toggle("open"));
function updateGreeting() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning," : hour < 17 ? "Good afternoon," : "Good evening,";
  $("#greetingText").textContent = greeting;
}
updateGreeting();
window.setInterval(updateGreeting, 60 * 1000);
$("#dateLabel").textContent = new Date().toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();
$("#showCrewForm").addEventListener("click", () => $("#crewForm").classList.toggle("hidden"));
$("#crewForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const body = Object.fromEntries(new FormData(form));
  try {
    await api("/crew", { method: "POST", body: JSON.stringify(body) });
    form.reset(); form.classList.add("hidden");
    await loadCrew(); await loadSummary(); toast("Crew profile saved to the database.");
  } catch (error) { toast(error.message); }
});
$("#telemetryForm").addEventListener("submit", async event => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget));
  for (const key of ["heartRate", "oxygen", "temperature", "respiration"]) body[key] = Number(body[key]);
  try {
    await api("/telemetry", { method: "POST", body: JSON.stringify(body) });
    event.currentTarget.reset();
    await loadTelemetry(); await loadSummary();
    toast("Telemetry record saved to the database.");
  } catch (error) { toast(error.message); }
});
$("#incidentForm").addEventListener("submit", async event => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await api("/incidents", { method: "POST", body: JSON.stringify(body) });
    event.currentTarget.reset();
    await loadIncidents(); await loadSummary();
    toast("Incident registered successfully.");
  } catch (error) { toast(error.message); }
});
$("#incidentRows").addEventListener("change", async event => {
  const select = event.target.closest("[data-incident]");
  if (!select) return;
  try {
    await api("/incidents/" + select.dataset.incident, { method: "PATCH", body: JSON.stringify({ status: select.value }) });
    await loadIncidents(); await loadSummary(); toast("Incident status updated.");
  } catch (error) { toast(error.message); }
});
$("#messageForm").addEventListener("submit", async event => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await api("/messages", { method: "POST", body: JSON.stringify(body) });
    event.currentTarget.reset();
    $("#messageForm [name=sender]").value = "Mission Control";
    await loadMessages(); toast("Mission note saved to the database.");
  } catch (error) { toast(error.message); }
});
async function start() {
  try {
    await refreshAll();
  } catch (error) {
    $("#connectionText").textContent = "SETUP REQUIRED";
    $("#connectionDot").classList.remove("online");
    toast(error.message);
    ["crewGrid","overviewCrew","overviewIncidents","messageList"].forEach(id => {
      const node = $("#" + id);
      if (node) node.innerHTML = '<p class="empty">Connect the backend database to load saved project data.</p>';
    });
  }
}
start();

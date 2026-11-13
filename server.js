require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "20kb" }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 180 }));
app.use(express.static(path.join(__dirname, "public")));

const crewSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 70 },
  role: { type: String, required: true, trim: true, maxlength: 60 },
  callSign: { type: String, required: true, trim: true, maxlength: 20 },
  status: { type: String, enum: ["On duty", "Resting", "Review"], default: "On duty" }
}, { timestamps: true });

const telemetrySchema = new mongoose.Schema({
  crewId: { type: mongoose.Schema.Types.ObjectId, ref: "Crew", required: true },
  heartRate: { type: Number, required: true, min: 30, max: 220 },
  oxygen: { type: Number, required: true, min: 50, max: 100 },
  temperature: { type: Number, required: true, min: 30, max: 45 },
  respiration: { type: Number, required: true, min: 4, max: 60 },
  source: { type: String, enum: ["manual-demo", "simulator"], default: "manual-demo" },
  recordedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const incidentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, enum: ["Medical", "Environmental", "Operational"], default: "Medical" },
  severity: { type: String, enum: ["Low", "Moderate", "High"], default: "Moderate" },
  description: { type: String, required: true, trim: true, maxlength: 700 },
  status: { type: String, enum: ["Open", "Monitoring", "Resolved"], default: "Open" },
  crewName: { type: String, trim: true, maxlength: 70, default: "Mission Control" }
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true, trim: true, maxlength: 70 },
  priority: { type: String, enum: ["Routine", "Important", "Urgent"], default: "Routine" },
  body: { type: String, required: true, trim: true, maxlength: 700 }
}, { timestamps: true });

const Crew = mongoose.model("Crew", crewSchema);
const Telemetry = mongoose.model("Telemetry", telemetrySchema);
const Incident = mongoose.model("Incident", incidentSchema);
const Message = mongoose.model("Message", messageSchema);

function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "Database is not connected. Check the server's MONGODB_URI setting." });
  }
  next();
}
app.get("/api/health", (req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? "online" : "waiting-for-database",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    application: "VitalOrbit API"
  });
});

app.use("/api", requireDatabase);

app.get("/api/summary", async (req, res, next) => {
  try {
    const [crewCount, activeIncidents, latest] = await Promise.all([
      Crew.countDocuments(),
      Incident.countDocuments({ status: { $ne: "Resolved" } }),
      Telemetry.find().sort({ recordedAt: -1 }).limit(1).populate("crewId", "name callSign")
    ]);
    res.json({ crewCount, activeIncidents, latestReading: latest[0] || null });
  } catch (error) { next(error); }
});

app.get("/api/crew", async (req, res, next) => {
  try { res.json(await Crew.find().sort({ createdAt: 1 })); }
  catch (error) { next(error); }
});

app.post("/api/crew", async (req, res, next) => {
  try {
    const { name, role, callSign } = req.body;
    if (![name, role, callSign].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ error: "Name, role and call sign are required." });
    }
    const member = await Crew.create({ name, role, callSign });
    res.status(201).json(member);
  } catch (error) { next(error); }
});

app.get("/api/telemetry", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const records = await Telemetry.find().sort({ recordedAt: -1 }).limit(limit).populate("crewId", "name callSign");
    res.json(records);
  } catch (error) { next(error); }
});

app.post("/api/telemetry", async (req, res, next) => {
  try {
    const { crewId, heartRate, oxygen, temperature, respiration } = req.body;
    if (!mongoose.isValidObjectId(crewId)) return res.status(400).json({ error: "Select a valid crew member." });
    const member = await Crew.findById(crewId);
    if (!member) return res.status(404).json({ error: "Crew member not found." });
    const values = { heartRate: Number(heartRate), oxygen: Number(oxygen), temperature: Number(temperature), respiration: Number(respiration) };
    if (Object.values(values).some(value => !Number.isFinite(value))) {
      return res.status(400).json({ error: "All four telemetry values must be numbers." });
    }
    const reading = await Telemetry.create({ crewId, ...values, source: "manual-demo" });
    res.status(201).json(await reading.populate("crewId", "name callSign"));
  } catch (error) { next(error); }
});

app.get("/api/incidents", async (req, res, next) => {
  try { res.json(await Incident.find().sort({ createdAt: -1 }).limit(100)); }
  catch (error) { next(error); }
});

app.post("/api/incidents", async (req, res, next) => {
  try {
    const { title, category, severity, description, crewName } = req.body;
    if (![title, description].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ error: "Incident title and description are required." });
    }
    const incident = await Incident.create({ title, category, severity, description, crewName });
    res.status(201).json(incident);
  } catch (error) { next(error); }
});

app.patch("/api/incidents/:id", async (req, res, next) => {
  try {
    const allowed = ["Open", "Monitoring", "Resolved"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Choose a valid incident status." });
    const incident = await Incident.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
    if (!incident) return res.status(404).json({ error: "Incident not found." });
    res.json(incident);
  } catch (error) { next(error); }
});

app.get("/api/messages", async (req, res, next) => {
  try { res.json(await Message.find().sort({ createdAt: -1 }).limit(100)); }
  catch (error) { next(error); }
});

app.post("/api/messages", async (req, res, next) => {
  try {
    const { sender, priority, body } = req.body;
    if (![sender, body].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ error: "Sender and message are required." });
    }
    const message = await Message.create({ sender, priority, body });
    res.status(201).json(message);
  } catch (error) { next(error); }
});

app.use("/api", (req, res) => res.status(404).json({ error: "API route not found." }));
app.use((error, req, res, next) => {
  console.error(error);
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ error: "The submitted data is not valid." });
  }
  res.status(500).json({ error: "An unexpected server error occurred." });
});

async function start() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is missing. Add it to your .env file before starting VitalOrbit.");
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  console.log("VitalOrbit database connected.");
  let crew = await Crew.find().sort({ createdAt: 1 });
  if (crew.length === 0) {
    crew = await Crew.insertMany([
      { name: "Alex Rivera", role: "Mission Commander", callSign: "ORBIT-01" },
      { name: "Maya Kim", role: "Flight Engineer", callSign: "ORBIT-02" },
      { name: "Jordan Singh", role: "Medical Officer", callSign: "ORBIT-03", status: "Review" }
    ]);
    console.log("Demo crew added.");
  }

  // Seed sample telemetry only when no readings exist yet.
  if (await Telemetry.countDocuments() === 0 && crew.length) {
    await Telemetry.insertMany([
      { crewId: crew[0]._id, heartRate: 70, oxygen: 98, temperature: 36.7, respiration: 15, source: "simulator", recordedAt: new Date(Date.now() - 42 * 60000) },
      { crewId: crew[Math.min(1, crew.length - 1)]._id, heartRate: 74, oxygen: 99, temperature: 36.8, respiration: 16, source: "simulator", recordedAt: new Date(Date.now() - 25 * 60000) },
      { crewId: crew[Math.min(2, crew.length - 1)]._id, heartRate: 72, oxygen: 97, temperature: 36.8, respiration: 16, source: "simulator", recordedAt: new Date(Date.now() - 8 * 60000) }
    ]);
    console.log("Sample demonstration telemetry added.");
  }

  // Seed realistic-looking example incidents once, without replacing user data.
  if (await Incident.countDocuments() === 0) {
    await Incident.insertMany([
      { title: "Cabin humidity above preferred range", category: "Environmental", severity: "Moderate", status: "Monitoring", crewName: "Flight Engineer", description: "A simulated cabin sensor reported a brief rise in humidity. Ventilation settings were adjusted and the reading is being monitored." },
      { title: "Ground link response delay", category: "Operational", severity: "Low", status: "Resolved", crewName: "Mission Control", description: "A short delay appeared in the simulated ground communication link. The connection returned to normal after a routine systems check." },
      { title: "Crew wellness follow-up requested", category: "Medical", severity: "Low", status: "Open", crewName: "Medical Officer", description: "A crew member reported mild fatigue during a routine check-in. A follow-up has been added to the next review window." }
    ]);
    console.log("Sample demonstration incidents added.");
  }

  // Add a few mission notes only when the notes archive is empty.
  if (await Message.countDocuments() === 0) {
    await Message.insertMany([
      { sender: "Mission Control", priority: "Routine", body: "Orbit insertion completed successfully. Crew systems are stable and the next scheduled status review is in 30 minutes." },
      { sender: "Flight Engineer", priority: "Important", body: "Cabin ventilation settings were adjusted following the humidity alert. Readings are being observed for the next monitoring cycle." },
      { sender: "Mission Commander", priority: "Routine", body: "All crew members have checked in. Continue standard observation schedule and report any change in cabin conditions." },
      { sender: "Ground Support", priority: "Routine", body: "Communication link test completed. Signal response is back within the expected range for this simulation." }
    ]);
    console.log("Sample demonstration mission notes added.");
  }
  app.listen(PORT, () => console.log("VitalOrbit running on port " + PORT));
}
start().catch(error => { console.error("Startup failed:", error.message); process.exit(1); });

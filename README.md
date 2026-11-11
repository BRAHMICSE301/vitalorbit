# VitalOrbit 2.0

A full-stack student-built crew health and mission operations workspace.

## Features
- Crew roster: create and view crew profiles.
- Telemetry: save heart rate, oxygen, temperature and respiration records for a crew member.
- Incident register: create incidents and update their status.
- Mission notes: save and retrieve messages.
- Overview: crew totals, active incidents and latest saved readings.

## Stack
Frontend: HTML, CSS and vanilla JavaScript.
Backend: Node.js and Express REST API.
Database: MongoDB Atlas with Mongoose.

## Run locally
1. Install Node.js 20 or newer.
2. Clone this repository and run npm install.
3. Copy .env.example to .env.
4. Create a MongoDB Atlas database and set MONGODB_URI in .env. Keep this secret out of GitHub.
5. Run npm run dev.
6. Open http://localhost:3000.

The first successful database connection inserts three fictional crew profiles and example telemetry if the crew collection is empty.

## API
- GET /api/health: server and database status.
- GET /api/summary: dashboard summary.
- GET and POST /api/crew: list and create crew profiles.
- GET and POST /api/telemetry: list and save readings.
- GET and POST /api/incidents: list and create incidents.
- PATCH /api/incidents/:id: update incident status.
- GET and POST /api/messages: list and save mission notes.

## Deploy
A Render blueprint is included in render.yaml. Create a Render Web Service from this repository, add MONGODB_URI as a private environment variable, and deploy. The health-check endpoint is /api/health.

## Project structure
- public/index.html: page structure.
- public/styles.css: visual design and responsive layout.
- public/app.js: browser interactions and API requests.
- server.js: Express routes, validation and database connection.

## How it works
The browser sends HTTP requests using fetch. Express receives each request, validates the data and uses Mongoose to read or write MongoDB documents. The server returns JSON and the browser updates the interface.

All crew and telemetry examples are fictional. VitalOrbit is an educational software project, not a medical device. It is not connected to real sensors or emergency services and must not be used for medical decisions.

# VitalOrbit 2.0

VitalOrbit is a full-stack, student-built crew health and mission operations workspace. It demonstrates a browser interface, a REST API, server-side validation, and persistent MongoDB storage.

## Features

- **Overview:** crew count, open incident count, latest saved telemetry and recent activity.
- **Crew roster:** create and view crew profiles.
- **Telemetry:** record heart rate, oxygen saturation, temperature and respiration against a crew profile; browse saved readings.
- **Incident register:** create incidents, set category/severity, and update status from Open to Monitoring or Resolved.
- **Mission notes:** save and retrieve operational messages.
- **System API:** health endpoint at `/api/health`.

All sample crew members and readings are fictional. This is not a medical device and must not be used for diagnosis, treatment or real emergency decisions.

## Technology

- Frontend: HTML, CSS and vanilla JavaScript
- Backend: Node.js and Express
- Database: MongoDB Atlas with Mongoose
- Security basics: Helmet headers, JSON request size limit, API rate limiting, input validation, and environment-based secrets

## Run locally

You need Node.js 20+ and a MongoDB database (MongoDB Atlas free cluster is suitable).

1. Clone the repository and open its folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env`.
4. Replace the example `MONGODB_URI` with your MongoDB Atlas connection string. Do not commit `.env`.
5. Start the server:
   ```bash
   npm run dev
   ```
6. Open http://localhost:3000.

On first successful connection, the server inserts three fictional crew profiles and their initial sample readings if the crew collection is empty.

## API reference

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Server and database connection state |
| GET | `/api/summary` | Dashboard summary |
| GET / POST | `/api/crew` | List or add crew |
| GET / POST | `/api/telemetry` | List or record telemetry |
| GET / POST | `/api/incidents` | List or register incidents |
| PATCH | `/api/incidents/:id` | Update incident status |
| GET / POST | `/api/messages` | List or save mission notes |

All API responses use JSON. The server validates submitted values and returns useful HTTP status codes for invalid or unavailable requests.

## Deploy on Render

1. Push this repository to GitHub.
2. In Render, create a new **Web Service** and connect this repository.
3. Use build command `npm install` and start command `npm start`.
4. Add the environment variable `MONGODB_URI` in Render's Environment settings.
5. Deploy. Render uses `/api/health` as the health-check route.

The included `render.yaml` provides the service configuration. The database connection string must be added privately in the hosting dashboard. Never paste it into source code or commit it.

## Folder structure

```text
vitalorbit/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── server.js
├── package.json
├── render.yaml
├── .env.example
└── .gitignore
```

## How it works

1. The browser loads the HTML, CSS and JavaScript from the Express server.
2. JavaScript sends HTTP requests using `fetch()`.
3. Express receives the request, checks the input, and calls the relevant Mongoose model.
4. Mongoose reads or writes a MongoDB document.
5. The server returns JSON and the browser updates the page.

The project is intentionally split into a small frontend, one API server, and a database layer so each part can be explained independently.

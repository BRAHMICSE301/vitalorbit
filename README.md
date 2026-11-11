# VitalOrbit

**A student-built astronaut health monitoring and emergency simulation dashboard.**

VitalOrbit is an educational front-end project that demonstrates how a mission-control interface could organize crew wellness summaries, sample telemetry, health insights, mission messages, emergency response practice, and basic system diagnostics.

## Features

- Mission Control dashboard with sample crew metrics and a vital-trend chart
- Crew Overview with fictional profiles and wellness summaries
- Health Telemetry with randomly generated sample readings and a small reading history
- Health Insights using simple, transparent rule-based observations
- Communications page with a browser-session mission message log
- Emergency Simulation with six fictional scenarios and interactive response checklists
- System Diagnostics with browser-side checks and an activity log
- Responsive layout for desktop, tablet, and mobile

## Run locally

This is a static HTML/CSS/JavaScript project. No build tools, package installation, API keys, or server are required.

1. Download or clone this repository.
2. Open `index.html` in a modern browser.

For a local development server, you can use the VS Code Live Server extension.

## Project structure

```text
vitalorbit/
├── index.html
├── README.md
└── .nojekyll
```

The current version intentionally keeps the implementation in one HTML file so first-year students can understand the complete flow from markup to styling to JavaScript interactions. As the project grows, CSS and JavaScript can be moved into separate files and modules.

## Important limitations

- All crew names and vital readings are fictional demonstration data.
- The dashboard is not connected to medical sensors, spacecraft systems, a cloud database, or external emergency services.
- Insights and thresholds are simplified educational examples, not medical advice or diagnostic criteria.
- Message and activity logs are held only in the current browser session/page and are not persisted to a server.
- Do not use this project to make health or safety decisions.

## Built with

- HTML5
- CSS3
- Vanilla JavaScript

Created as a first-year CSE learning project.

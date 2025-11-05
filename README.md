# User Story to Tests

Convert Jira user stories into structured test cases with a small full‑stack app (Vite React frontend + Express/TypeScript backend).

## Features
- Fetch Jira issue details from the frontend only (via Vite dev proxy)
- Parse description into "User Story" and "Acceptance Criteria" sections
- Generate test cases using the backend LLM endpoint
- "Start Over" button to reset form after generation

## Tech stack
- Frontend: Vite + React + TypeScript
- Backend: Express + TypeScript
- LLM provider: Groq (configurable via env)

## Quick start

### Prereqs
- Node.js 18+ and npm
- A Jira Cloud/Server account and API token (for basic auth), or a bearer token

### 1) Install

```bash
npm install
```

### 2) Environment variables
Create and fill in your environment files locally:

- Root backend/smoke test: `.env`
- Frontend proxy: `frontend/.env.local`

Note: `.env` and `.env.local` are ignored by git by default.

### 3) Run dev servers

```bash
npm run dev
```

- Backend: http://localhost:8080
- Frontend: http://localhost:5173

The frontend dev proxy is enabled when `VITE_JIRA_BASE_URL` is present at frontend startup. Requests go to `/jira/...` and are proxied to your Jira base URL.

### 4) Frontend Jira fetch
- Enter a Jira ID (e.g., `PROJ-123`) and click "Fetch Jira details"
- The UI populates Story Title, Description, and Acceptance Criteria
- Click "Generate" to produce test cases
- Use "Start Over" in the results header to reset and enter another Jira ID

### 5) Smoke test (optional)
A Node script to validate Jira connectivity using the root `.env`:

```bash
npm run -w frontend test:jira
```

It prints the issue key, summary, and whether the description contains User Story/Acceptance Criteria sections.

## Scripts
- `npm run dev` — run backend and frontend together
- `npm run build` — build both workspaces
- `npm run typecheck` — typecheck both workspaces
- `npm run -w frontend test:jira` — Jira smoke test

## Security notes
- Do not commit real API tokens. In this test repo, keys are blank in committed env files.
- Jira auth is basic (email + API token). Bearer auth isn’t used.
- The Vite proxy passes the Authorization header through to Jira in development only. For production, configure a proper backend proxy.

## License
MIT

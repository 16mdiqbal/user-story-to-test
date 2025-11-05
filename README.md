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
Create a `.env` at repo root for the backend and smoke tests:

```ini
PORT=8080
CORS_ORIGIN=http://localhost:5173

groq_API_BASE=https://api.groq.com/openai/v1
# Provide your real key here for local use only
# groq_API_KEY=...

groq_MODEL=openai/gpt-oss-120b

# Jira (used by the Node smoke test only)
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_AUTH_TYPE=basic
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your_api_token
JIRA_ISSUE_KEY=PROJ-123
```

Create a `frontend/.env.local` for the browser + proxy (never commit secrets):

```ini
VITE_JIRA_BASE_URL=https://your-domain.atlassian.net
VITE_JIRA_AUTH_TYPE=basic
VITE_JIRA_EMAIL=you@example.com
VITE_JIRA_API_TOKEN=your_api_token
# Optional: VITE_JIRA_ACCEPTANCE_FIELD=customfield_12345
```

Note: `.env` and `.env.local` are ignored by git.

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
- Do not commit real API tokens or `.env*` files. `.gitignore` is configured to exclude them.
- The Vite proxy passes the Authorization header through to Jira in development only. For production, configure a proper backend proxy.

## License
MIT

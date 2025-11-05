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
Create and fill in your environment files locally. This repo supports a 3-tier env layout:

- Common vars: `.env` (repo root)
- Backend-only overrides: `backend/.env`
- Frontend-only overrides: `frontend/.env.local`

Frontend reads Jira settings from either VITE_* or maps from root JIRA_* keys:

```
# Either in frontend/.env.local or root .env (using JIRA_* keys)
VITE_JIRA_BASE_URL=https://your-domain.atlassian.net
VITE_JIRA_AUTH_TYPE=basic
VITE_JIRA_EMAIL=you@example.com
VITE_JIRA_API_TOKEN=your_api_token
# Optional custom field for Acceptance Criteria (ADF or text)
VITE_JIRA_ACCEPTANCE_FIELD=

# Optional: call Jira directly from the browser instead of using the dev proxy
# CAUTION: may hit CORS; default is false which uses the /jira dev proxy
VITE_JIRA_DIRECT=false
```

Note: `.env`, `backend/.env`, and `frontend/.env.local` are ignored by git by default.

### 3) Run dev servers

```bash
npm run dev
```

- Backend: http://localhost:8080
- Frontend: http://localhost:5173

The frontend dev proxy is enabled when `VITE_JIRA_BASE_URL` is present at frontend startup. Requests go to `/jira/...` and are proxied to your Jira base URL. To bypass the proxy and call Jira directly (useful if you prefer seeing the full Jira URL in the Network tab), set `VITE_JIRA_DIRECT=true` — but note this can be blocked by CORS depending on your Jira configuration.

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

# User Story to Tests

Convert Jira user stories into structured test cases with a small full‑stack app (Vite React frontend + Express/TypeScript backend).

## Features
- Fetch Jira issue details through the backend proxy (no Jira auth exposed in the browser)
- Parse description into "User Story" and "Acceptance Criteria" sections
- Generate test cases using the backend LLM endpoint
- "Start Over" button to reset form after generation
- Full-screen loading overlay while test cases are generated
- Automatic scroll to the generated results once ready

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

- Common vars: create `.env` in the repo root (ignored by git)
- Backend-only overrides: `backend/.env` (optional, also ignored)
- Frontend-only overrides: `frontend/.env.local` (optional, also ignored)

Frontend reads Jira settings by mirroring the backend `JIRA_*` variables into `VITE_*` keys so you can optionally forward Basic auth during local development:

```
# Either in frontend/.env.local or root .env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_AUTH_TYPE=basic
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your_api_token

VITE_JIRA_BASE_URL=https://your-domain.atlassian.net
VITE_JIRA_AUTH_TYPE=basic
VITE_JIRA_EMAIL=you@example.com
VITE_JIRA_API_TOKEN=your_api_token
VITE_JIRA_FORWARD_BASIC=true

# Optional custom field for Acceptance Criteria (ADF or text)
VITE_JIRA_ACCEPTANCE_FIELD=
```

- `VITE_JIRA_FORWARD_BASIC` forwards the Basic auth header through the backend proxy when server-side credentials are missing.
- Set `VITE_JIRA_DIRECT=true` only if you plan to call Jira directly from the browser; CORS may block it, so the backend proxy is recommended.
- Example files are ignored by default, so create your own `.env` files locally to keep credentials out of version control.

### 3) Run dev servers

```bash
npm run dev
```

- Backend: http://localhost:8080
- Frontend: http://localhost:5173 (falls back to the next open port if 5173 is busy)

### 4) Frontend Jira fetch
- Enter a Jira ID (e.g., `PROJ-123`) and click "Fetch Jira details"
- The UI populates Story Title, Description, and Acceptance Criteria
- Click "Generate" to produce test cases (a loading overlay indicates progress)
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
- Keep your `.env` files outside version control; populate them locally with real credentials.
- Jira auth defaults to Basic (email + API token) but Bearer tokens are supported.
- The Express backend proxies all Jira traffic; optional Basic-auth forwarding from the browser should only be used during local development.

## License
MIT

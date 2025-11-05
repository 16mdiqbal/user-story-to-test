/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_JIRA_BASE_URL?: string
  readonly VITE_JIRA_AUTH_TYPE?: 'basic' | 'bearer'
  readonly VITE_JIRA_EMAIL?: string
  readonly VITE_JIRA_API_TOKEN?: string
  readonly VITE_JIRA_ACCEPTANCE_FIELD?: string
  readonly VITE_JIRA_DIRECT?: string
  readonly VITE_JIRA_FORWARD_BASIC?: string
  // Expose root JIRA_* for direct access in the frontend (dev-only usage)
  readonly JIRA_BASE_URL?: string
  readonly JIRA_AUTH_TYPE?: 'basic' | 'bearer'
  readonly JIRA_EMAIL?: string
  readonly JIRA_API_TOKEN?: string
  readonly JIRA_ACCEPTANCE_FIELD?: string
  readonly JIRA_DIRECT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
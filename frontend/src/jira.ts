// Frontend-only Jira client using either direct calls or Vite proxy
// Credentials are read from localStorage for dev use only.

export type JiraAuthType = 'basic' | 'bearer'

export interface JiraConfig {
  baseUrl?: string
  authType?: JiraAuthType
  email?: string
  apiToken?: string
  bearer?: string
  acceptanceField?: string
}

function getJiraConfig(): JiraConfig {
  // Read from Vite env at build-time; ensure variables are prefixed with VITE_
  const baseUrl = import.meta.env.VITE_JIRA_BASE_URL as string | undefined
  const authType = (import.meta.env.VITE_JIRA_AUTH_TYPE as JiraAuthType | undefined) || 'basic'
  const email = import.meta.env.VITE_JIRA_EMAIL as string | undefined
  const apiToken = import.meta.env.VITE_JIRA_API_TOKEN as string | undefined
  const bearer = import.meta.env.VITE_JIRA_BEARER as string | undefined
  const acceptanceField = import.meta.env.VITE_JIRA_ACCEPTANCE_FIELD as string | undefined
  return { baseUrl, authType, email, apiToken, bearer, acceptanceField }
}

function buildAuthHeader(cfg: JiraConfig): string | undefined {
  if (cfg.authType === 'basic' && cfg.email && cfg.apiToken) {
    const token = btoa(`${cfg.email}:${cfg.apiToken}`)
    return `Basic ${token}`
  }
  if (cfg.authType === 'bearer' && cfg.bearer) {
    return `Bearer ${cfg.bearer}`
  }
  return undefined
}

function adfToPlainText(adf: any): string {
  // Minimal ADF to text converter (best-effort)
  if (!adf) return ''
  const parts: string[] = []
  const walk = (node: any) => {
    if (!node) return
    if (Array.isArray(node)) {
      for (const child of node) {
        walk(child)
      }
      return
    }
    switch (node.type) {
      case 'doc':
      case 'paragraph':
      case 'bulletList':
      case 'orderedList':
      case 'listItem':
      case 'heading':
        if (node.content) walk(node.content)
        if (node.type === 'paragraph' || node.type === 'heading') parts.push('\n')
        break
      case 'text':
        parts.push(node.text || '')
        break
      case 'hardBreak':
        parts.push('\n')
        break
      default:
        if (node.content) walk(node.content)
    }
  }
  walk(adf)
  // Collapse triple newlines to double without requiring String#replaceAll
  return parts.join('').split('\n\n\n').join('\n\n').trim()
}

export interface JiraIssueResult {
  key: string
  summary: string
  descriptionText: string
  acceptanceCriteria?: string
}

export async function fetchJiraIssue(jiraId: string): Promise<JiraIssueResult> {
  const cfg = getJiraConfig()
  const fields = ['summary', 'description']
  if (cfg.acceptanceField) fields.push(cfg.acceptanceField)

  const baseUrl = cfg.baseUrl || ''
  // Always prefer the Vite dev proxy in development to avoid CORS.
  // The proxy itself is activated by starting Vite with VITE_JIRA_BASE_URL set.
  const useProxy = import.meta.env.DEV
  if (useProxy && !import.meta.env.VITE_JIRA_BASE_URL) {
    // Surface a clear, actionable error instead of an opaque 404 when proxy isn't configured
    throw new Error('Jira proxy not configured. Start dev with VITE_JIRA_BASE_URL=<your Jira base> (and VITE_JIRA_* auth vars) or create frontend/.env.local with those values and restart the dev server.')
  }
  const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const params = new URLSearchParams({ fields: fields.join(',') })
  const url = useProxy
    ? `/jira/rest/api/3/issue/${encodeURIComponent(jiraId)}?${params.toString()}`
    : `${trimmedBase}/rest/api/3/issue/${encodeURIComponent(jiraId)}?${params.toString()}`
  if (import.meta.env.DEV) {
    // Helpful debug with no sensitive data
    console.debug('[Jira] Fetch URL:', url, useProxy ? '(proxied via /jira)' : '(direct)')
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json'
  }
  const auth = buildAuthHeader(cfg)
  if (auth) headers['Authorization'] = auth

  const res = await fetch(url, { headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Jira error ${res.status}: ${text || res.statusText}`)
  }
  const data = await res.json()
  const summary: string = data?.fields?.summary || ''
  const descriptionAdf = data?.fields?.description
  const descriptionText = typeof descriptionAdf === 'string' ? descriptionAdf : adfToPlainText(descriptionAdf)

  let acceptance: string | undefined
  if (cfg.acceptanceField && data?.fields?.[cfg.acceptanceField]) {
    const v = data.fields[cfg.acceptanceField]
    acceptance = typeof v === 'string' ? v : adfToPlainText(v)
  } else if (descriptionText) {
    // heuristic: extract "Acceptance Criteria" section
  const re = /Acceptance Criteria[:-]?\s*([\s\S]*)/i
  const m = re.exec(descriptionText)
  if (m) acceptance = m[1].trim()
  }

  return {
    key: data?.key || jiraId,
    summary,
    descriptionText,
    acceptanceCriteria: acceptance?.trim()
  }
}

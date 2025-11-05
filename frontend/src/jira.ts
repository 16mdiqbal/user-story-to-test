// Frontend-only Jira client using either direct calls or Vite proxy
// Credentials are read from localStorage for dev use only.

// Note: We now fetch Jira via backend proxy, so no auth/secrets are used in the browser.

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
  targetUrl?: string
}

export async function fetchJiraIssue(jiraId: string): Promise<JiraIssueResult> {
  // CORS-safe: fetch via backend proxy so the browser never calls Jira directly
  const backendApi = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
  const url = `${backendApi}/jira/issue/${encodeURIComponent(jiraId)}`
  if (import.meta.env.DEV) console.debug('[Jira] Fetch via backend proxy:', url)
  // Optional dev-only: forward Basic auth to backend when server creds are missing
  const headers: Record<string, string> = { Accept: 'application/json' }
  const forward = String(import.meta.env.VITE_JIRA_FORWARD_BASIC || 'false').toLowerCase() === 'true'
  const email = import.meta.env.VITE_JIRA_EMAIL as unknown as string | undefined
  const token = import.meta.env.VITE_JIRA_API_TOKEN as unknown as string | undefined
  if (forward && email && token) {
    const creds = btoa(`${email}:${token}`)
    headers['Authorization'] = `Basic ${creds}`
  }
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Jira error ${res.status}: ${text || res.statusText}`)
  }
  const targetUrl = res.headers.get('x-jira-target-url') || undefined
  const data = await res.json()
  const summary: string = data?.fields?.summary || ''
  const descriptionAdf = data?.fields?.description
  const descriptionText = typeof descriptionAdf === 'string' ? descriptionAdf : adfToPlainText(descriptionAdf)

  let acceptance: string | undefined
  const acceptanceField = (import.meta.env.VITE_JIRA_ACCEPTANCE_FIELD || undefined) as unknown as string | undefined
  if (acceptanceField && data?.fields?.[acceptanceField]) {
    const v = data.fields[acceptanceField]
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
    acceptanceCriteria: acceptance?.trim(),
    targetUrl
  }
}

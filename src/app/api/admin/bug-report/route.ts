import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'

const REPO = 'SpaceyPuppy/trakovo'
const LABELS = [
  { name: 'bug', color: 'd73a4a', description: 'Something is not working' },
  { name: 'admin-portal-report', color: '0075ca', description: 'Reported via the admin portal bug report button' },
]

async function githubFetch(path: string, options: RequestInit = {}) {
  return fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

async function ensureLabels() {
  for (const label of LABELS) {
    const check = await githubFetch(`/labels/${encodeURIComponent(label.name)}`)
    if (check.status === 404) {
      await githubFetch('/labels', {
        method: 'POST',
        body: JSON.stringify(label),
      })
    }
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GITHUB_TOKEN is not configured' }, { status: 503 })
  }

  const { title, description, url, userAgent, viewport } = await req.json()

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!description?.trim()) return NextResponse.json({ error: 'Description is required' }, { status: 400 })

  const now = new Date().toLocaleString('en-AU', {
    timeZone: 'Australia/Melbourne',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const body = [
    '## Bug Report',
    '',
    `**Reported by:** ${session.username}`,
    `**Time:** ${now} AEST`,
    `**Page URL:** \`${url ?? 'unknown'}\``,
    viewport ? `**Viewport:** ${viewport}` : null,
    userAgent ? `**Browser:** ${userAgent}` : null,
    '',
    '### Description',
    description.trim(),
    '',
    '---',
    '*Submitted via in-app bug report button*',
  ].filter(line => line !== null).join('\n')

  try {
    await ensureLabels()

    const res = await githubFetch('/issues', {
      method: 'POST',
      body: JSON.stringify({
        title: title.trim(),
        body,
        labels: LABELS.map(l => l.name),
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('[bug-report] GitHub API error', res.status, err)
      return NextResponse.json({ error: 'Failed to create GitHub issue' }, { status: 502 })
    }

    const issue = await res.json()
    return NextResponse.json({ ok: true, issue_url: issue.html_url, issue_number: issue.number })
  } catch (e) {
    console.error('[bug-report] Unexpected error', e)
    return NextResponse.json({ error: 'Unexpected error creating issue' }, { status: 500 })
  }
}

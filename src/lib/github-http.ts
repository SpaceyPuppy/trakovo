import { request } from 'node:https'

const API_ROOT = 'https://api.github.com/repos/SpaceyPuppy/trakovo/releases'
const downloadHosts = ['api.github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com', 'github-releases.githubusercontent.com', 'github.com']

export class GitHubTransportError extends Error {
  constructor(readonly code: string) { super(`GitHub HTTPS connection failed (${code}). Check outbound HTTPS, DNS and certificates on the host, or use Manual Deploy.`); this.name = 'GitHubTransportError' }
}

/** Only fixed-repository API endpoints are entry points; download redirects stay on GitHub. */
async function githubRequest(url: string, binary: boolean, redirects = 0): Promise<Buffer> {
  let target: URL
  try { target = new URL(url) } catch { throw new GitHubTransportError('INVALID_DESTINATION') }
  if (target.protocol !== 'https:' || target.username || target.password || target.port && target.port !== '443'
    || !(binary ? downloadHosts : ['api.github.com']).includes(target.hostname)) throw new GitHubTransportError('INVALID_DESTINATION')
  if (redirects > 5) throw new GitHubTransportError('TOO_MANY_REDIRECTS')
  const headers: Record<string, string> = {
    Accept: binary ? 'application/octet-stream' : 'application/vnd.github+json',
    'User-Agent': 'Trakovo-Updater', 'X-GitHub-Api-Version': '2022-11-28',
  }
  // Never forward the private-repository credential to a CDN or signed asset URL.
  if (target.hostname === 'api.github.com' && process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const limit = binary ? 128 * 1024 * 1024 : 2 * 1024 * 1024
  const result = await new Promise<Buffer | URL>((resolve, reject) => {
    let complete = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    function fail(error: unknown) {
      if (complete) return
      complete = true
      clearTimeout(timeout)
      const code = (error as { code?: unknown })?.code
      reject(new GitHubTransportError(typeof code === 'string' && /^[A-Z0-9_]{1,50}$/.test(code) ? code : 'NETWORK_ERROR'))
    }
    const outgoing = request(target, { headers }, incoming => {
      incoming.on('error', fail)
      incoming.on('aborted', () => fail({ code: 'RESPONSE_ABORTED' }))
      const status = incoming.statusCode ?? 0
      if ([301, 302, 303, 307, 308].includes(status) && binary && incoming.headers.location) {
        try {
          const next = new URL(incoming.headers.location, target)
          complete = true
          clearTimeout(timeout)
          incoming.resume()
          resolve(next)
        } catch { fail({ code: 'INVALID_REDIRECT' }) }
        return
      }
      if (status !== 200) { fail({ code: `HTTP_${status}` }); outgoing.destroy(); return }
      if (Number(incoming.headers['content-length']) > limit) { fail({ code: 'RESPONSE_TOO_LARGE' }); outgoing.destroy(); return }
      const chunks: Buffer[] = []
      let size = 0
      incoming.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > limit) { fail({ code: 'RESPONSE_TOO_LARGE' }); outgoing.destroy(); return }
        chunks.push(Buffer.from(chunk))
      })
      incoming.on('end', () => {
        if (complete) return
        complete = true
        clearTimeout(timeout)
        resolve(Buffer.concat(chunks))
      })
    })
    outgoing.on('error', fail)
    timeout = setTimeout(() => { fail({ code: 'REQUEST_TIMEOUT' }); outgoing.destroy() }, binary ? 120_000 : 15_000)
    outgoing.end()
  })
  return result instanceof URL ? githubRequest(result.toString(), binary, redirects + 1) : result
}

export async function getLatestGitHubRelease(): Promise<{
  tag_name?: string; name?: string; html_url?: string; published_at?: string
  assets?: Array<{ id: number; name: string; size: number; browser_download_url: string }>
}> {
  const buffer = await githubRequest(`${API_ROOT}/latest`, false)
  try {
    const data = JSON.parse(buffer.toString('utf8'))
    if (!data || typeof data.tag_name !== 'string' || !Array.isArray(data.assets)) throw new Error()
    return data
  } catch { throw new GitHubTransportError('INVALID_RESPONSE') }
}

export async function downloadGitHubAsset(assetId: number): Promise<Buffer> {
  if (!Number.isSafeInteger(assetId) || assetId <= 0) throw new GitHubTransportError('INVALID_ASSET')
  return githubRequest(`${API_ROOT}/assets/${assetId}`, true)
}

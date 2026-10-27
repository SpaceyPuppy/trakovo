import { request } from 'node:https'

export class MicrosoftTransportError extends Error {
  constructor(readonly code: string) { super(`Microsoft HTTPS request failed (${code})`); this.name = 'MicrosoftTransportError' }
}

export interface MicrosoftHttpResponse {
  ok: boolean
  status: number
  text(): Promise<string>
  json<T = unknown>(): Promise<T>
}

/** Microsoft-only Node HTTPS transport; does not depend on fetch/undici's WASM parser. */
export async function microsoftRequest(url: string, options: { method?: string; headers?: Record<string, string>; body?: string | URLSearchParams } = {}): Promise<MicrosoftHttpResponse> {
  const target = new URL(url)
  if (target.protocol !== 'https:' || target.username || target.password || target.port && target.port !== '443'
    || !['login.microsoftonline.com', 'graph.microsoft.com'].includes(target.hostname)) {
    throw new MicrosoftTransportError('INVALID_DESTINATION')
  }
  const body = options.body?.toString()
  const headers = { ...options.headers, ...(body !== undefined ? { 'Content-Length': String(Buffer.byteLength(body)) } : {}) }
  return new Promise((resolve, reject) => {
    let complete = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    function fail(error: unknown) {
      if (complete) return
      complete = true
      clearTimeout(timeout)
      const code = (error as { code?: unknown })?.code
      reject(new MicrosoftTransportError(typeof code === 'string' && /^[A-Z0-9_]{1,50}$/.test(code) ? code : 'NETWORK_ERROR'))
    }
    const outgoing = request(target, { method: options.method ?? 'GET', headers }, incoming => {
      const chunks: Buffer[] = []
      let size = 0
      incoming.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > 2 * 1024 * 1024) { fail({ code: 'RESPONSE_TOO_LARGE' }); outgoing.destroy(); return }
        chunks.push(Buffer.from(chunk))
      })
      incoming.on('error', fail)
      incoming.on('aborted', () => fail({ code: 'RESPONSE_ABORTED' }))
      incoming.on('end', () => {
        if (complete) return
        complete = true
        clearTimeout(timeout)
        const text = Buffer.concat(chunks).toString('utf8')
        const status = incoming.statusCode ?? 0
        resolve({ ok: status >= 200 && status < 300, status, text: async () => text, json: async <T>() => JSON.parse(text) as T })
      })
    })
    outgoing.on('error', fail)
    timeout = setTimeout(() => { fail({ code: 'REQUEST_TIMEOUT' }); outgoing.destroy() }, 15_000)
    outgoing.end(body)
  })
}

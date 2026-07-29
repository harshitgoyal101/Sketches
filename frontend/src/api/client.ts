export class ApiError extends Error {
  status: number
  errors: Record<string, string[]>

  constructor(
    message: string,
    status: number,
    errors: Record<string, string[]> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`),
  )
  return match ? decodeURIComponent(match[1]) : null
}

let csrfReady: Promise<void> | null = null

export async function ensureCsrfCookie(): Promise<void> {
  if (getCookie('csrftoken')) return
  if (!csrfReady) {
    csrfReady = fetch('/api/auth/csrf/', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
      .then(() => undefined)
      .finally(() => {
        csrfReady = null
      })
  }
  await csrfReady
}

type FetchJsonOptions = {
  method?: string
  body?: unknown
  fallbackMessage?: string
}

async function parseResponse<T>(
  response: Response,
  fallbackMessage?: string,
): Promise<T> {
  let data: unknown = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const payload = data as
      | { errors?: Record<string, string[]>; error?: string }
      | null
    const errors = payload?.errors ?? {}
    const message =
      payload?.error ||
      errors.__all__?.[0] ||
      Object.values(errors).flat()[0] ||
      fallbackMessage ||
      `Request failed: ${response.status}`
    throw new ApiError(message, response.status, errors)
  }

  return data as T
}

export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (method !== 'GET' && method !== 'HEAD') {
    await ensureCsrfCookie()
    const csrf = getCookie('csrftoken')
    if (csrf) headers['X-CSRFToken'] = csrf
  }

  let body: string | undefined
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  const response = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers,
    body,
  })

  return parseResponse<T>(response, options.fallbackMessage)
}

export async function fetchMultipart<T>(
  url: string,
  formData: FormData,
  options: { fallbackMessage?: string } = {},
): Promise<T> {
  await ensureCsrfCookie()
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  const csrf = getCookie('csrftoken')
  if (csrf) headers['X-CSRFToken'] = csrf

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body: formData,
  })

  return parseResponse<T>(response, options.fallbackMessage)
}

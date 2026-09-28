import { linksEtEnv } from '@/lib/env'

export type LinksEtErrorCode =
  | 'invalid_json'
  | 'invalid_request'
  | 'missing_key'
  | 'invalid_key'
  | 'revoked_key'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'image_cap_reached'
  | 'ocr_daily_cap_reached'
  | 'provider_down'
  | 'ai_not_configured'
  | 'detection_failed'
  | string

export type LinksEtReceipt = Record<string, unknown> & {
  source?: string
}

export type LinksEtVerifySuccess = {
  ok: true
  providerKey: string
  resolvedUrl: string
  httpStatus: number
  fetchedAt: string
  receipt: LinksEtReceipt
  rawHtmlLength?: number
  error: null
  processingStatus?: string
  requestId?: string
  cached?: boolean
}

export type LinksEtVerifyProcessing = {
  ok?: false
  processingStatus: 'queued' | 'processing' | string
  requestId: string
  statusUrl: string
  eventsUrl: string
}

export type LinksEtVerifyFailure = {
  ok: false
  error: string | { code?: LinksEtErrorCode; message?: string; used?: number; cap?: number; issues?: unknown }
  receipt?: LinksEtReceipt
  providerKey?: string
  httpStatus?: number
}

export type LinksEtVerifyResult = LinksEtVerifySuccess | LinksEtVerifyProcessing | LinksEtVerifyFailure

export type LinksEtImageResult = {
  ok?: boolean
  detections?: Array<{
    provider?: string | null
    reference?: string | null
    confidence?: number | null
    url?: string | null
  }>
  upstream?: {
    result?: LinksEtVerifyResult
  }
  error?: LinksEtVerifyFailure['error']
}

type VerifyInput =
  | { url: string; reference?: never; waitMs?: number }
  | { reference: string; url?: never; waitMs?: number }

function apiKey() {
  return linksEtEnv().apiKey
}

function baseUrl() {
  return linksEtEnv().baseUrl
}

function retryAfterSeconds(response: Response) {
  const raw = response.headers.get('retry-after')
  if (!raw) return null
  const seconds = Number(raw)
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null
}

export function linksEtErrorCode(error: LinksEtVerifyFailure['error'] | null | undefined): LinksEtErrorCode | null {
  if (!error) return null
  if (typeof error === 'string') return null
  return error.code ?? null
}

export function linksEtErrorMessage(error: LinksEtVerifyFailure['error'] | null | undefined): string {
  if (!error) return 'Verification failed'
  if (typeof error === 'string') return error
  return error.message || error.code || 'Verification failed'
}

/** Retry rules from https://links.et/agents.md — returns ms to wait, or null = do not retry. */
export function linksEtRetryDelayMs(status: number, code: LinksEtErrorCode | null, retryAfter: number | null) {
  if (status === 401) return null
  if (code === 'invalid_json' || code === 'invalid_request') return null
  if (code === 'quota_exceeded' || code === 'image_cap_reached') return null
  if (code === 'ai_not_configured') return null
  if (code === 'rate_limited' || code === 'provider_down') {
    return ((retryAfter ?? 1) + Math.random()) * 1000
  }
  if (code === 'ocr_daily_cap_reached') return 60_000
  if (status === 502 || (status === 400 && !code)) {
    return (1 + Math.random()) * 1000
  }
  return null
}

async function parseJson(response: Response) {
  try {
    return (await response.json()) as unknown
  } catch {
    return null
  }
}

async function postLinksEt<T>(
  path: string,
  body: unknown,
  opts?: { idempotencyKey?: string; maxAttempts?: number },
): Promise<{ status: number; data: T; retryAfter: number | null }> {
  const maxAttempts = opts?.maxAttempts ?? 3
  let attempt = 0
  let lastStatus = 0
  let lastData: T | null = null
  let lastRetryAfter: number | null = null

  while (attempt < maxAttempts) {
    attempt += 1
    const response = await fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey(),
        ...(opts?.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
    })

    const data = (await parseJson(response)) as T
    const retryAfter = retryAfterSeconds(response)
    lastStatus = response.status
    lastData = data
    lastRetryAfter = retryAfter

    if (response.status === 202 || response.ok) {
      return { status: response.status, data, retryAfter }
    }

    const code =
      data && typeof data === 'object' && 'error' in data
        ? linksEtErrorCode((data as unknown as LinksEtVerifyFailure).error)
        : null

    // Never retry Siinqee — five-view meter on the bank side.
    const providerKey =
      data && typeof data === 'object' && 'providerKey' in data
        ? String((data as { providerKey?: unknown }).providerKey ?? '')
        : ''
    if (providerKey === 'siinqee') {
      return { status: response.status, data, retryAfter }
    }

    const delay = linksEtRetryDelayMs(response.status, code, retryAfter)
    if (delay == null || attempt >= maxAttempts) {
      return { status: response.status, data, retryAfter }
    }
    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  return { status: lastStatus, data: lastData as T, retryAfter: lastRetryAfter }
}

export async function verifyReceipt(
  input: VerifyInput,
  opts?: { idempotencyKey?: string },
): Promise<{ status: number; data: LinksEtVerifyResult }> {
  const body =
    'url' in input && input.url
      ? { url: input.url, ...(input.waitMs != null ? { waitMs: input.waitMs } : {}) }
      : { reference: input.reference, ...(input.waitMs != null ? { waitMs: input.waitMs } : {}) }

  const { status, data } = await postLinksEt<LinksEtVerifyResult>('/api/verify', body, {
    idempotencyKey: opts?.idempotencyKey,
    maxAttempts: 3,
  })
  return { status, data }
}

export async function verifyReceiptImage(
  imageBase64: string,
  opts?: { idempotencyKey?: string },
): Promise<{ status: number; data: LinksEtImageResult }> {
  const { status, data } = await postLinksEt<LinksEtImageResult>(
    '/api/verify-image',
    { imageBase64 },
    { idempotencyKey: opts?.idempotencyKey, maxAttempts: 2 },
  )
  return { status, data }
}

export function upstreamReceiptFromImage(data: LinksEtImageResult): LinksEtVerifySuccess | null {
  const result = data.upstream?.result
  if (!result || typeof result !== 'object') return null
  if ('ok' in result && result.ok === true && 'receipt' in result) {
    return result as LinksEtVerifySuccess
  }
  return null
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { getAuthCookies } from '@/lib/auth-cookies'
import { createSupabaseClient } from '@/lib/supabase/server'

export const RESEARCH_COLUMNS =
  'id, user_id, title, researcher_name, field, description, abstract, research_url, institution, location, keywords, is_published, published_at, created_at, updated_at, support_settings(enabled)'

export const DISCOVER_COLUMNS =
  'id, user_id, title, researcher_name, field, description, research_url, institution, location, support_settings!inner(enabled)'

export type ResearchWrite = {
  title?: string
  researcherName?: string | null
  field?: string | null
  description?: string | null
  abstract?: string | null
  researchUrl?: string | null
  institution?: string | null
  location?: string | null
  keywords?: unknown
  visibility?: unknown
  isPublished?: unknown
  supportEnabled?: unknown
}

const VISIBILITY_KEYS = ['visibility', 'isPublished', 'is_published', 'supportEnabled', 'support_enabled'] as const

function clean(value: string | null | undefined) {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed || null
}

export function researchColumns(
  body: ResearchWrite,
  opts?: { titleRequired?: boolean },
): { ok: true; columns: Record<string, unknown> } | { ok: false; error: string } {
  const raw = body as Record<string, unknown>
  if (VISIBILITY_KEYS.some((key) => raw[key] !== undefined)) {
    return { ok: false, error: 'visibility changes only through publish and unpublish' }
  }

  const columns: Record<string, unknown> = {}

  if (body.title !== undefined || opts?.titleRequired) {
    const title = body.title?.trim() ?? ''
    if (!title) return { ok: false, error: opts?.titleRequired ? 'title is required' : 'title cannot be empty' }
    columns.title = title
  }
  if (body.researcherName !== undefined) columns.researcher_name = clean(body.researcherName)
  if (body.field !== undefined) columns.field = clean(body.field)
  if (body.description !== undefined) columns.description = clean(body.description)
  if (body.abstract !== undefined) columns.abstract = clean(body.abstract)
  if (body.institution !== undefined) columns.institution = clean(body.institution)
  if (body.location !== undefined) columns.location = clean(body.location)
  if (body.researchUrl !== undefined) {
    const url = clean(body.researchUrl)
    if (url && !/^https?:\/\//i.test(url)) return { ok: false, error: 'researchUrl must start with http:// or https://' }
    columns.research_url = url
  }
  if (body.keywords !== undefined) {
    if (!Array.isArray(body.keywords) || body.keywords.some((item) => typeof item !== 'string')) {
      return { ok: false, error: 'keywords must be an array of strings' }
    }
    columns.keywords = body.keywords.map((item) => item.trim()).filter(Boolean)
  }

  return { ok: true, columns }
}

export function missingPublishFields(row: {
  title: string | null
  researcher_name: string | null
  field: string | null
  description: string | null
}) {
  const missing: string[] = []
  if (!row.title?.trim()) missing.push('title')
  if (!row.researcher_name?.trim()) missing.push('researcherName')
  if (!row.field?.trim()) missing.push('field')
  if (!row.description?.trim()) missing.push('description')
  return missing
}

function embeddedRows(embedded: unknown) {
  return (Array.isArray(embedded) ? embedded : embedded ? [embedded] : []).filter(
    (row): row is Record<string, unknown> => !!row && typeof row === 'object',
  )
}

export function readSupportEnabled(embedded: unknown) {
  return embeddedRows(embedded).some((row) => row.enabled === true)
}

export function paymentConfigured(embedded: unknown) {
  return embeddedRows(embedded).some((row) => {
    const provider = typeof row.payment_provider === 'string' ? row.payment_provider.trim() : ''
    const account = typeof row.payment_account_id === 'string' ? row.payment_account_id.trim() : ''
    return provider.length > 0 && account.length > 0
  })
}

export function visibleOnDiscover(isPublished: boolean, supportEnabled: boolean) {
  return isPublished && supportEnabled
}

export function supportUpdate(input: {
  enabled: boolean
  paymentProvider: string | null
  paymentAccountId: string | null
  projectPublished: boolean
}): { ok: true; enabled: boolean; paymentProvider: string | null; paymentAccountId: string | null } | { ok: false; error: string } {
  const paymentProvider = input.paymentProvider?.trim() || null
  const paymentAccountId = input.paymentAccountId?.trim() || null
  const paid = !!paymentProvider && !!paymentAccountId

  if (input.enabled && !paid) return { ok: false, error: 'support requires payment configuration' }
  if (input.enabled !== input.projectPublished) {
    return {
      ok: false,
      error: input.projectPublished ? 'unpublish before disabling support' : 'publish to enable support',
    }
  }

  return { ok: true, enabled: input.enabled, paymentProvider, paymentAccountId }
}

export function discoverSearchFilter(q: string) {
  const term = q.trim().replace(/[%_\\",().]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!term) return null
  const pattern = `"%${term}%"`
  return ['title', 'researcher_name', 'description', 'field'].map((column) => `${column}.ilike.${pattern}`).join(',')
}

export function exactFilter(value: string | null) {
  const term = value?.trim().replace(/[%_\\",]/g, '') ?? ''
  return term || null
}

export async function viewerClient(
  request: Request,
): Promise<
  | { ok: true; userId: string | null; supabase: SupabaseClient }
  | { ok: false; response: Response }
> {
  const { accessToken: cookieToken } = getAuthCookies(request)
  const authHeader = request.headers.get('authorization')
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!cookieToken && !bearer) {
    return { ok: true, userId: null, supabase: createSupabaseClient() }
  }

  const auth = await requireUser(request)
  if (!auth.ok) return auth
  return { ok: true, userId: auth.user.id, supabase: auth.supabase }
}

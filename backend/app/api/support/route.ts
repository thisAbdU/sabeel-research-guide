import { getAuthCookies } from '@/lib/auth-cookies'
import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { toSupportSettings, toSupportTransaction, toTopSupporter } from '@/lib/mappers'
import { supportUpdate } from '@/lib/research'
import { requireAdminClient } from '@/lib/supabase/admin'
import {
  createPaymentReference,
  methodsFromSettingsRow,
  parsePaymentMethods,
  publicCheckoutMethods,
  sanitizeSupporterName,
} from '@/lib/support'

export const maxDuration = 30

export function OPTIONS() {
  return options()
}

async function optionalUser(request: Request) {
  const { accessToken: cookieToken } = getAuthCookies(request)
  const authHeader = request.headers.get('authorization')
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!cookieToken && !bearer) return null
  const auth = await requireUser(request)
  return auth.ok ? auth : null
}

/** Researcher: settings + own tip history. Public: top supporters via ?view=supporters */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const researchProjectId = url.searchParams.get('researchProjectId')
  if (!researchProjectId) return error('researchProjectId is required')

  const view = url.searchParams.get('view')
  if (view === 'supporters') {
    const admin = requireAdminClient()
    if (!admin.ok) return admin.response

    const { data, error: listError } = await admin.supabase
      .from('support_transactions')
      .select('supporter_name, is_anonymous, amount, currency, verified_at, created_at')
      .eq('research_project_id', researchProjectId)
      .eq('status', 'completed')
      .order('amount', { ascending: false })
      .order('verified_at', { ascending: false })
      .limit(20)

    if (listError) return error(listError.message, 500)
    return json({ supporters: (data ?? []).map(toTopSupporter) })
  }

  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const { data: settings, error: settingsError } = await auth.supabase
    .from('support_settings')
    .select('*')
    .eq('research_project_id', researchProjectId)
    .maybeSingle()

  if (settingsError) return error(settingsError.message, 500)

  const { data: transactions, error: txError } = await auth.supabase
    .from('support_transactions')
    .select('*')
    .eq('research_project_id', researchProjectId)
    .order('created_at', { ascending: false })

  if (txError) return error(txError.message, 500)

  return json({
    settings: settings ? toSupportSettings(settings) : null,
    transactions: (transactions ?? []).map(toSupportTransaction),
  })
}

/** Researcher toggles support / payment methods (legacy + methods[]). */
export async function PUT(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const body = await readBody<{
    researchProjectId?: string
    enabled?: boolean
    paymentProvider?: string | null
    paymentAccountId?: string | null
    paymentAccountName?: string | null
    paymentMethods?: unknown
  }>(request)

  const researchProjectId = body?.researchProjectId
  if (!researchProjectId) return error('researchProjectId is required')
  if (typeof body?.enabled !== 'boolean') return error('enabled is required')

  let methodsPayload: unknown = body.paymentMethods
  if (body.paymentMethods != null) {
    const parsed = parsePaymentMethods(body.paymentMethods)
    if (!parsed.ok) return error(parsed.error)
    methodsPayload = parsed.methods
  } else if (body.paymentProvider && body.paymentAccountId) {
    const parsed = parsePaymentMethods([
      {
        provider: body.paymentProvider,
        accountId: body.paymentAccountId,
        accountName: body.paymentAccountName || body.paymentAccountId,
      },
    ])
    if (!parsed.ok) return error(parsed.error)
    methodsPayload = parsed.methods
  }

  const primary =
    Array.isArray(methodsPayload) && methodsPayload[0]
      ? (methodsPayload[0] as { provider: string; accountId: string; accountName: string })
      : null

  const { data: project, error: projectError } = await auth.supabase
    .from('research_projects')
    .select('id, is_published')
    .eq('id', researchProjectId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (projectError) return error(projectError.message, 500)
  if (!project) return error('Research project not found', 404)

  const decision = supportUpdate({
    enabled: body.enabled,
    paymentProvider: primary?.provider ?? body.paymentProvider ?? null,
    paymentAccountId: primary?.accountId ?? body.paymentAccountId ?? null,
    paymentAccountName: primary?.accountName ?? body.paymentAccountName ?? null,
    paymentMethods: methodsPayload,
    projectPublished: project.is_published,
  })
  if (!decision.ok) return error(decision.error)

  const { data, error: upsertError } = await auth.supabase
    .from('support_settings')
    .upsert(
      {
        user_id: auth.user.id,
        research_project_id: researchProjectId,
        enabled: decision.enabled,
        payment_provider: decision.paymentProvider,
        payment_account_id: decision.paymentAccountId,
        payment_account_name: decision.paymentAccountName,
        payment_methods: decision.paymentMethods,
      },
      { onConflict: 'research_project_id' },
    )
    .select('*')
    .single()

  if (upsertError || !data) return error(upsertError?.message ?? 'Could not save settings', 500)
  return json({ settings: toSupportSettings(data) })
}

/**
 * Initiate a support tip: create a pending transaction and return checkout payout details.
 * links.et does not initiate transfers — the supporter pays the researcher manually.
 */
export async function POST(request: Request) {
  const body = await readBody<{
    researchId?: string
    researchProjectId?: string
    amount?: number
    currency?: string
    supporterName?: string | null
    anonymous?: boolean
  }>(request)

  const researchProjectId = body?.researchProjectId?.trim() || body?.researchId?.trim()
  const amount = body?.amount
  if (!researchProjectId || !amount || amount <= 0) {
    return error('researchProjectId and a positive amount are required')
  }
  if (amount > 1_000_000) return error('amount is too large')

  const admin = requireAdminClient()
  if (!admin.ok) return admin.response

  const { data: project, error: projectError } = await admin.supabase
    .from('research_projects')
    .select('id, is_published, support_settings(*)')
    .eq('id', researchProjectId)
    .maybeSingle()

  if (projectError) return error(projectError.message, 500)
  if (!project || !project.is_published) return error('Research project not found', 404)

  const settingsRow = Array.isArray(project.support_settings)
    ? project.support_settings[0]
    : project.support_settings
  if (!settingsRow?.enabled) return error('Support is not enabled for this project', 400)

  const methods = methodsFromSettingsRow(settingsRow)
  if (!methods.length) return error('Researcher has not configured payment details', 400)

  const user = await optionalUser(request)
  const explicitAnonymous = body?.anonymous === true
  const supporterName = sanitizeSupporterName(body?.supporterName, explicitAnonymous)
  const anonymous = explicitAnonymous || !supporterName
  const paymentReference = createPaymentReference()

  const { data, error: createError } = await admin.supabase
    .from('support_transactions')
    .insert({
      support_settings_id: settingsRow.id,
      research_project_id: researchProjectId,
      supporter_user_id: user?.user.id ?? null,
      supporter_name: supporterName,
      is_anonymous: anonymous || !supporterName,
      amount,
      currency: body?.currency?.trim().toLowerCase() || 'etb',
      status: 'pending',
      payment_reference: paymentReference,
    })
    .select('*')
    .single()

  if (createError || !data) return error(createError?.message ?? 'Could not create transaction', 500)

  return json(
    {
      data: {
        paymentId: data.id,
        status: 'pending',
        amount: Number(data.amount),
        currency: data.currency,
        paymentReference,
        checkout: {
          methods: publicCheckoutMethods(methods),
          // Include this in the transfer reason/narrative when the wallet allows it.
          paymentReference,
        },
        transaction: toSupportTransaction(data),
      },
    },
    201,
  )
}

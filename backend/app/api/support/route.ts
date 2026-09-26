import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { toSupportSettings, toSupportTransaction } from '@/lib/mappers'
import { supportUpdate } from '@/lib/research'

export function OPTIONS() {
  return options()
}

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const researchProjectId = new URL(request.url).searchParams.get('researchProjectId')
  if (!researchProjectId) return error('researchProjectId is required')

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

export async function PUT(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const body = await readBody<{
    researchProjectId?: string
    enabled?: boolean
    paymentProvider?: string | null
    paymentAccountId?: string | null
  }>(request)

  const researchProjectId = body?.researchProjectId
  if (!researchProjectId) return error('researchProjectId is required')
  if (typeof body?.enabled !== 'boolean') return error('enabled is required')

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
    paymentProvider: body.paymentProvider ?? null,
    paymentAccountId: body.paymentAccountId ?? null,
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
      },
      { onConflict: 'research_project_id' },
    )
    .select('*')
    .single()

  if (upsertError || !data) return error(upsertError?.message ?? 'Could not save settings', 500)
  return json({ settings: toSupportSettings(data) })
}

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const body = await readBody<{
    researchProjectId?: string
    amount?: number
    currency?: string
  }>(request)

  const researchProjectId = body?.researchProjectId
  const amount = body?.amount
  if (!researchProjectId || !amount || amount <= 0) {
    return error('researchProjectId and a positive amount are required')
  }

  const { data: settings, error: settingsError } = await auth.supabase
    .from('support_settings')
    .select('*')
    .eq('research_project_id', researchProjectId)
    .maybeSingle()

  if (settingsError) return error(settingsError.message, 500)
  if (!settings?.enabled) return error('Support is not enabled for this project', 400)

  const { data, error: createError } = await auth.supabase
    .from('support_transactions')
    .insert({
      support_settings_id: settings.id,
      research_project_id: researchProjectId,
      supporter_user_id: auth.user.id,
      amount,
      currency: body.currency?.trim().toLowerCase() || 'usd',
      status: 'pending',
    })
    .select('*')
    .single()

  if (createError || !data) return error(createError?.message ?? 'Could not create transaction', 500)
  return json({ transaction: toSupportTransaction(data) }, 201)
}

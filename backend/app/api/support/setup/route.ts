import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { toSupportSettings } from '@/lib/mappers'
import { supportUpdate } from '@/lib/research'
import { parsePaymentMethods } from '@/lib/support'

export function OPTIONS() {
  return options()
}

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const body = await readBody<{
    researchId?: string
    paymentMethod?: string
    paymentAccountId?: string
    paymentAccountName?: string
    paymentMethods?: unknown
  }>(request)

  const researchId = body?.researchId?.trim()
  if (!researchId) return error('researchId is required')

  let methods
  if (body?.paymentMethods != null) {
    const parsed = parsePaymentMethods(body.paymentMethods)
    if (!parsed.ok) return error(parsed.error)
    methods = parsed.methods
  } else {
    const paymentMethod = body?.paymentMethod?.trim()
    const paymentAccountId = body?.paymentAccountId?.trim()
    const paymentAccountName = body?.paymentAccountName?.trim()
    if (!paymentMethod || !paymentAccountId || !paymentAccountName) {
      return error('paymentMethods, or paymentMethod + paymentAccountId + paymentAccountName, are required')
    }
    const parsed = parsePaymentMethods([
      { provider: paymentMethod, accountId: paymentAccountId, accountName: paymentAccountName },
    ])
    if (!parsed.ok) return error(parsed.error)
    methods = parsed.methods
  }

  const primary = methods[0]

  const { data: project, error: projectError } = await auth.supabase
    .from('research_projects')
    .select('id, is_published')
    .eq('id', researchId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (projectError) return error(projectError.message, 500)
  if (!project) return error('Research project not found', 404)

  const decision = supportUpdate({
    enabled: project.is_published,
    paymentProvider: primary.provider,
    paymentAccountId: primary.accountId,
    paymentAccountName: primary.accountName,
    paymentMethods: methods,
    projectPublished: project.is_published,
  })
  if (!decision.ok) return error(decision.error)

  const { data, error: upsertError } = await auth.supabase
    .from('support_settings')
    .upsert(
      {
        user_id: auth.user.id,
        research_project_id: researchId,
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

  return json({
    data: {
      researchId,
      configured: true,
      status: 'ready',
      settings: toSupportSettings(data),
    },
  })
}

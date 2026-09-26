import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { supportUpdate } from '@/lib/research'

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
  }>(request)

  const researchId = body?.researchId?.trim()
  const paymentMethod = body?.paymentMethod?.trim()
  const paymentAccountId = body?.paymentAccountId?.trim()
  if (!researchId || !paymentMethod || !paymentAccountId) {
    return error('researchId, paymentMethod, and paymentAccountId are required')
  }

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
    paymentProvider: paymentMethod,
    paymentAccountId,
    projectPublished: project.is_published,
  })
  if (!decision.ok) return error(decision.error)

  const { error: upsertError } = await auth.supabase.from('support_settings').upsert(
    {
      user_id: auth.user.id,
      research_project_id: researchId,
      enabled: decision.enabled,
      payment_provider: decision.paymentProvider,
      payment_account_id: decision.paymentAccountId,
    },
    { onConflict: 'research_project_id' },
  )

  if (upsertError) return error(upsertError.message, 500)

  return json({
    data: {
      researchId,
      configured: true,
      status: 'ready',
    },
  })
}

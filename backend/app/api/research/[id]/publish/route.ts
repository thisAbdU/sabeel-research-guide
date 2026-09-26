import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { missingPublishFields, paymentConfigured } from '@/lib/research'

export function OPTIONS() {
  return options()
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const body = await readBody<{ confirm?: boolean }>(request)
  if (body?.confirm !== true) return error('confirm must be true')

  const { id } = await params
  const { data: project, error: fetchError } = await auth.supabase
    .from('research_projects')
    .select('id, title, researcher_name, field, description, support_settings(enabled, payment_provider, payment_account_id)')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (fetchError) return error(fetchError.message, 500)
  if (!project) return error('Research project not found', 404)

  const missing = missingPublishFields(project)
  if (missing.length > 0) return error(`Missing public fields: ${missing.join(', ')}`)
  if (!paymentConfigured(project.support_settings)) {
    return error('Payment setup is required before publishing')
  }

  const { error: supportError } = await auth.supabase
    .from('support_settings')
    .update({ enabled: true })
    .eq('research_project_id', id)
    .eq('user_id', auth.user.id)

  if (supportError) return error(supportError.message, 500)

  const { error: updateError } = await auth.supabase
    .from('research_projects')
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', auth.user.id)

  if (updateError) {
    await auth.supabase
      .from('support_settings')
      .update({ enabled: false })
      .eq('research_project_id', id)
      .eq('user_id', auth.user.id)
    return error(updateError.message, 500)
  }

  return json({
    data: {
      id,
      visibility: 'public',
      supportEnabled: true,
      status: 'published',
    },
  })
}

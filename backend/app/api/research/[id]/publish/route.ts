import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { missingPublishFields, readSupportEnabled } from '@/lib/research'

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
    .select('id, title, researcher_name, field, description, support_settings(enabled)')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (fetchError) return error(fetchError.message, 500)
  if (!project) return error('Research project not found', 404)

  const missing = missingPublishFields(project)
  if (missing.length > 0) return error(`Missing public fields: ${missing.join(', ')}`)

  const { error: updateError } = await auth.supabase
    .from('research_projects')
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', auth.user.id)

  if (updateError) return error(updateError.message, 500)

  return json({
    data: {
      id,
      visibility: 'public',
      supportEnabled: readSupportEnabled(project.support_settings),
      status: 'published',
    },
  })
}

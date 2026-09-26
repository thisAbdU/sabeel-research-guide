import { requireUser } from '@/lib/auth'
import { error, json, options } from '@/lib/http'

export function OPTIONS() {
  return options()
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const { data, error: updateError } = await auth.supabase
    .from('research_projects')
    .update({ is_published: false, published_at: null })
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .select('id')
    .maybeSingle()

  if (updateError) return error(updateError.message, 500)
  if (!data) return error('Research project not found', 404)

  const { error: supportError } = await auth.supabase
    .from('support_settings')
    .update({ enabled: false })
    .eq('research_project_id', id)
    .eq('user_id', auth.user.id)

  if (supportError) return error(supportError.message, 500)

  return json({
    data: {
      id,
      visibility: 'private',
      supportEnabled: false,
      status: 'unpublished',
    },
  })
}

import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { toResearchProject } from '@/lib/mappers'
import { RESEARCH_COLUMNS, readSupportEnabled, researchColumns, viewerClient, visibleOnDiscover, type ResearchWrite } from '@/lib/research'

export function OPTIONS() {
  return options()
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await viewerClient(request)
  if (!viewer.ok) return viewer.response

  const { id } = await params
  const { data, error: fetchError } = await viewer.supabase
    .from('research_projects')
    .select(RESEARCH_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return error(fetchError.message, 500)
  const supportEnabled = data ? readSupportEnabled(data.support_settings) : false
  if (!data || (data.user_id !== viewer.userId && !visibleOnDiscover(data.is_published, supportEnabled))) {
    return error('Research project not found', 404)
  }

  return json({ data: toResearchProject(data, supportEnabled) })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const body = await readBody<ResearchWrite>(request)
  if (!body) return error('Invalid JSON body')

  const parsed = researchColumns(body)
  if (!parsed.ok) return error(parsed.error)
  if (Object.keys(parsed.columns).length === 0) return error('No fields to update')

  const { id } = await params
  const { data, error: updateError } = await auth.supabase
    .from('research_projects')
    .update(parsed.columns)
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .select(RESEARCH_COLUMNS)
    .maybeSingle()

  if (updateError) return error(updateError.message, 500)
  if (!data) return error('Research project not found', 404)
  return json({ data: toResearchProject(data, readSupportEnabled(data.support_settings)) })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const { data, error: deleteError } = await auth.supabase
    .from('research_projects')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .select('id')
    .maybeSingle()

  if (deleteError) return error(deleteError.message, 500)
  if (!data) return error('Research project not found', 404)
  return json({ ok: true })
}

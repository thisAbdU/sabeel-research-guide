import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { toResearchProject } from '@/lib/mappers'

export function OPTIONS() {
  return options()
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const { data, error: fetchError } = await auth.supabase
    .from('research_projects')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return error(fetchError.message, 500)
  if (!data) return error('Research project not found', 404)
  return json({ project: toResearchProject(data) })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await readBody<{
    title?: string
    summary?: string | null
    content?: string | null
    isPublished?: boolean
  }>(request)

  if (!body) return error('Invalid JSON body')

  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) {
    const title = body.title.trim()
    if (!title) return error('title cannot be empty')
    updates.title = title
  }
  if (body.summary !== undefined) updates.summary = body.summary?.trim() || null
  if (body.content !== undefined) updates.content = body.content?.trim() || null
  if (body.isPublished !== undefined) {
    updates.is_published = body.isPublished
    updates.published_at = body.isPublished ? new Date().toISOString() : null
  }

  if (Object.keys(updates).length === 0) return error('No fields to update')

  const { data, error: updateError } = await auth.supabase
    .from('research_projects')
    .update(updates)
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .select('*')
    .maybeSingle()

  if (updateError) return error(updateError.message, 500)
  if (!data) return error('Research project not found', 404)
  return json({ project: toResearchProject(data) })
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

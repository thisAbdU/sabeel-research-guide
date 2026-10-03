import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { toFundingMatch } from '@/lib/mappers'

export function OPTIONS() {
  return options()
}

type Authed = Extract<Awaited<ReturnType<typeof requireUser>>, { ok: true }>

async function resolveConversationProject(
  auth: Authed,
  conversationId: string,
): Promise<
  | { projectId: string | null }
  | { error: string; status: number }
> {
  const { data: conv, error: convError } = await auth.supabase
    .from('conversations')
    .select('id, research_project_id')
    .eq('id', conversationId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (convError) return { error: convError.message, status: 500 }
  if (!conv) return { error: 'Conversation not found', status: 404 }
  return { projectId: conv.research_project_id }
}

async function ensureProjectForConversation(
  auth: Authed,
  conversationId: string,
): Promise<{ projectId: string } | { error: string; status: number }> {
  const { data: conv, error: convError } = await auth.supabase
    .from('conversations')
    .select('id, title, research_project_id')
    .eq('id', conversationId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (convError) return { error: convError.message, status: 500 }
  if (!conv) return { error: 'Conversation not found', status: 404 }
  if (conv.research_project_id) return { projectId: conv.research_project_id }

  const title = (conv.title?.trim() || 'Funding research draft').slice(0, 300)
  const { data: project, error: createError } = await auth.supabase
    .from('research_projects')
    .insert({
      user_id: auth.user.id,
      title,
      description: 'Draft created while saving funder matches from Get Funding.',
      keywords: [],
      is_published: false,
    })
    .select('id')
    .single()

  if (createError || !project) {
    return { error: createError?.message ?? 'Could not create research project', status: 500 }
  }

  const { error: linkError } = await auth.supabase
    .from('conversations')
    .update({ research_project_id: project.id })
    .eq('id', conversationId)
    .eq('user_id', auth.user.id)

  if (linkError) return { error: linkError.message, status: 500 }
  return { projectId: project.id }
}

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const params = new URL(request.url).searchParams
  const researchProjectId = params.get('researchProjectId')
  const conversationId = params.get('conversationId')

  let projectId = researchProjectId

  if (!projectId && conversationId) {
    const resolved = await resolveConversationProject(auth, conversationId)
    if ('error' in resolved) return error(resolved.error, resolved.status)
    if (!resolved.projectId) {
      return json({ matches: [], researchProjectId: null })
    }
    projectId = resolved.projectId
  }

  if (projectId) {
    const { data: project, error: projectError } = await auth.supabase
      .from('research_projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (projectError) return error(projectError.message, 500)
    if (!project) return error('Research project not found', 404)

    const { data, error: listError } = await auth.supabase
      .from('funding_matches')
      .select('*')
      .eq('research_project_id', projectId)
      .order('created_at', { ascending: false })

    if (listError) return error(listError.message, 500)
    return json({
      matches: (data ?? []).map(toFundingMatch),
      researchProjectId: projectId,
    })
  }

  const { data, error: listError } = await auth.supabase
    .from('funding_matches')
    .select('*, research_projects!inner(user_id, title)')
    .eq('research_projects.user_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (listError) return error(listError.message, 500)

  return json({
    matches: (data ?? []).map((row) => {
      const project = row.research_projects as { title?: string } | null
      return {
        ...toFundingMatch(row),
        researchTitle: project?.title ?? null,
      }
    }),
  })
}

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const body = await readBody<{
    researchProjectId?: string
    conversationId?: string
    organizationName?: string
    programName?: string
    description?: string
    url?: string
    relevanceNote?: string
    relevanceScore?: number
  }>(request)

  const organizationName = body?.organizationName?.trim()
  if (!organizationName) return error('organizationName is required')

  let researchProjectId = body?.researchProjectId?.trim() || null

  if (!researchProjectId && body?.conversationId) {
    const ensured = await ensureProjectForConversation(auth, body.conversationId)
    if ('error' in ensured) return error(ensured.error, ensured.status)
    researchProjectId = ensured.projectId
  }

  if (!researchProjectId) {
    return error('researchProjectId or conversationId is required')
  }

  const { data: project, error: projectError } = await auth.supabase
    .from('research_projects')
    .select('id')
    .eq('id', researchProjectId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (projectError) return error(projectError.message, 500)
  if (!project) return error('Research project not found', 404)

  const url = body?.url?.trim() || null

  let existingQuery = auth.supabase
    .from('funding_matches')
    .select('*')
    .eq('research_project_id', researchProjectId)
    .eq('organization_name', organizationName)
    .limit(1)

  existingQuery = url
    ? existingQuery.eq('url', url)
    : existingQuery.is('url', null)

  const { data: existing } = await existingQuery.maybeSingle()
  if (existing) {
    return json({ match: toFundingMatch(existing), researchProjectId })
  }

  const { data, error: createError } = await auth.supabase
    .from('funding_matches')
    .insert({
      research_project_id: researchProjectId,
      organization_name: organizationName,
      program_name: body?.programName?.trim() || null,
      description: body?.description?.trim() || null,
      url,
      relevance_note: body?.relevanceNote?.trim() || null,
      relevance_score: body?.relevanceScore ?? null,
    })
    .select('*')
    .single()

  if (createError || !data) return error(createError?.message ?? 'Could not save match', 500)
  return json({ match: toFundingMatch(data), researchProjectId }, 201)
}

export async function DELETE(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return error('id is required')

  const { data: row, error: fetchError } = await auth.supabase
    .from('funding_matches')
    .select('id, research_project_id, research_projects!inner(user_id)')
    .eq('id', id)
    .eq('research_projects.user_id', auth.user.id)
    .maybeSingle()

  if (fetchError) return error(fetchError.message, 500)
  if (!row) return error('Funding match not found', 404)

  const { error: deleteError } = await auth.supabase
    .from('funding_matches')
    .delete()
    .eq('id', id)

  if (deleteError) return error(deleteError.message, 500)
  return json({ ok: true })
}

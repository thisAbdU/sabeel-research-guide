import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { toFundingMatch } from '@/lib/mappers'

export function OPTIONS() {
  return options()
}

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const researchProjectId = new URL(request.url).searchParams.get('researchProjectId')
  if (!researchProjectId) return error('researchProjectId is required')

  const { data, error: listError } = await auth.supabase
    .from('funding_matches')
    .select('*')
    .eq('research_project_id', researchProjectId)
    .order('created_at', { ascending: false })

  if (listError) return error(listError.message, 500)
  return json({ matches: (data ?? []).map(toFundingMatch) })
}

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const body = await readBody<{
    researchProjectId?: string
    organizationName?: string
    programName?: string
    description?: string
    url?: string
    relevanceNote?: string
    relevanceScore?: number
  }>(request)

  const researchProjectId = body?.researchProjectId
  const organizationName = body?.organizationName?.trim()
  if (!researchProjectId || !organizationName) {
    return error('researchProjectId and organizationName are required')
  }

  const { data: project, error: projectError } = await auth.supabase
    .from('research_projects')
    .select('id')
    .eq('id', researchProjectId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (projectError) return error(projectError.message, 500)
  if (!project) return error('Research project not found', 404)

  // ponytail: save matches only; add generator when funding search is wired
  const { data, error: createError } = await auth.supabase
    .from('funding_matches')
    .insert({
      research_project_id: researchProjectId,
      organization_name: organizationName,
      program_name: body?.programName?.trim() || null,
      description: body?.description?.trim() || null,
      url: body?.url?.trim() || null,
      relevance_note: body?.relevanceNote?.trim() || null,
      relevance_score: body?.relevanceScore ?? null,
    })
    .select('*')
    .single()

  if (createError || !data) return error(createError?.message ?? 'Could not save match', 500)
  return json({ match: toFundingMatch(data) }, 201)
}

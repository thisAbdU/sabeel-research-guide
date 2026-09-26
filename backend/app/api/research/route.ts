import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { toDiscoverResearch, toResearchProject } from '@/lib/mappers'
import { RESEARCH_COLUMNS, readSupportEnabled, researchColumns, viewerClient, type ResearchWrite } from '@/lib/research'

export function OPTIONS() {
  return options()
}

export async function GET(request: Request) {
  const viewer = await viewerClient(request)
  if (!viewer.ok) return viewer.response

  const { data, error: listError } = await viewer.supabase
    .from('research_projects')
    .select(RESEARCH_COLUMNS)
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  if (listError) return error(listError.message, 500)

  return json({
    data: {
      research: (data ?? []).map((row) => toDiscoverResearch(row, readSupportEnabled(row.support_settings))),
    },
  })
}

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const body = await readBody<ResearchWrite>(request)
  if (!body) return error('Invalid JSON body')

  const parsed = researchColumns(body, { titleRequired: true })
  if (!parsed.ok) return error(parsed.error)

  const { data, error: createError } = await auth.supabase
    .from('research_projects')
    .insert({ user_id: auth.user.id, ...parsed.columns })
    .select(RESEARCH_COLUMNS)
    .single()

  if (createError || !data) return error(createError?.message ?? 'Could not create research', 500)
  return json({ data: toResearchProject(data, readSupportEnabled(data.support_settings)) }, 201)
}

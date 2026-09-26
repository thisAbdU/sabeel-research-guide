import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { toDiscoverResearch, toResearchProject } from '@/lib/mappers'
import {
  DISCOVER_COLUMNS,
  RESEARCH_COLUMNS,
  discoverSearchFilter,
  exactFilter,
  readSupportEnabled,
  researchColumns,
  viewerClient,
  type ResearchWrite,
} from '@/lib/research'

export function OPTIONS() {
  return options()
}

export async function GET(request: Request) {
  const viewer = await viewerClient(request)
  if (!viewer.ok) return viewer.response

  const params = new URL(request.url).searchParams
  const q = discoverSearchFilter(params.get('q') ?? '')
  const field = exactFilter(params.get('field'))
  const location = exactFilter(params.get('location'))

  let query = viewer.supabase
    .from('research_projects')
    .select(DISCOVER_COLUMNS)
    .eq('is_published', true)
    .eq('support_settings.enabled', true)
    .order('published_at', { ascending: false })

  if (field) query = query.ilike('field', field)
  if (location) query = query.ilike('location', location)
  if (q) query = query.or(q)

  const { data, error: listError } = await query

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

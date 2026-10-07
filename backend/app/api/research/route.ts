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
import { normalizeDiscoverField } from '@/lib/research-fields'
import { aggregateTopSupporters } from '@/lib/support'

export function OPTIONS() {
  return options()
}

export async function GET(request: Request) {
  const viewer = await viewerClient(request)
  if (!viewer.ok) return viewer.response

  const params = new URL(request.url).searchParams
  const q = discoverSearchFilter(params.get('q') ?? '')
  const fieldParam = exactFilter(params.get('field'))
  const field = fieldParam ? normalizeDiscoverField(fieldParam) : null
  const location = exactFilter(params.get('location'))

  let query = viewer.supabase
    .from('research_projects')
    .select(DISCOVER_COLUMNS)
    .eq('is_published', true)
    .eq('support_settings.enabled', true)
    .order('published_at', { ascending: false })

  // Exact match on canonical Discover labels (e.g. "AI & Tech")
  if (field) query = query.eq('field', field)
  if (location) query = query.ilike('location', location)
  if (q) query = query.or(q)

  const { data, error: listError } = await query

  if (listError) return error(listError.message, 500)

  const rows = data ?? []
  const projectIds = rows.map((row) => row.id)
  const supportersByProject = new Map<string, ReturnType<typeof aggregateTopSupporters>>()

  if (projectIds.length > 0) {
    const { data: tipRows, error: tipError } = await viewer.supabase
      .from('support_transactions')
      .select(
        'research_project_id, supporter_name, is_anonymous, amount, currency, verified_at, created_at',
      )
      .in('research_project_id', projectIds)
      .eq('status', 'completed')
      .order('amount', { ascending: false })
      .limit(500)

    if (tipError) return error(tipError.message, 500)

    const grouped = new Map<string, NonNullable<typeof tipRows>>()
    for (const tip of tipRows ?? []) {
      const list = grouped.get(tip.research_project_id) ?? []
      list.push(tip)
      grouped.set(tip.research_project_id, list)
    }
    for (const [projectId, tips] of grouped) {
      supportersByProject.set(projectId, aggregateTopSupporters(tips, 5))
    }
  }

  return json({
    data: {
      research: rows.map((row) => ({
        ...toDiscoverResearch(row, readSupportEnabled(row.support_settings)),
        topSupporters: supportersByProject.get(row.id) ?? [],
      })),
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

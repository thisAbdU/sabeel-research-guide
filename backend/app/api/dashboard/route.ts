import { requireUser } from '@/lib/auth'
import { error, json, options } from '@/lib/http'
import { toFundingMatch, toResearchProject } from '@/lib/mappers'
import { readSupportEnabled, RESEARCH_COLUMNS } from '@/lib/research'

export function OPTIONS() {
  return options()
}

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const userId = auth.user.id

  const [
    { data: projects, error: projectsError },
    { data: fundingRows, error: fundingError },
    { data: tipRows, error: tipsError },
  ] = await Promise.all([
    auth.supabase
      .from('research_projects')
      .select(RESEARCH_COLUMNS)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    auth.supabase
      .from('funding_matches')
      .select('*, research_projects!inner(user_id, title)')
      .eq('research_projects.user_id', userId)
      .order('created_at', { ascending: false }),
    auth.supabase
      .from('support_transactions')
      .select('amount, currency, status, research_projects!inner(user_id)')
      .eq('research_projects.user_id', userId)
      .eq('status', 'completed'),
  ])

  if (projectsError) return error(projectsError.message, 500)
  if (fundingError) return error(fundingError.message, 500)
  if (tipsError) return error(tipsError.message, 500)

  const list = projects ?? []
  const published = list.filter((row) => row.is_published)
  const drafts = list.filter((row) => !row.is_published)
  const tipsTotal = (tipRows ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0)
  const tipsCurrency = (tipRows ?? [])[0]?.currency?.toUpperCase() || 'ETB'
  const fundingMatches = (fundingRows ?? []).map((row) => {
    const project = row.research_projects as { title?: string } | null
    return {
      ...toFundingMatch(row),
      researchTitle: project?.title ?? null,
    }
  })

  return json({
    data: {
      stats: {
        publishedWorks: published.length,
        draftIdeas: drafts.length,
        fundingMatches: fundingMatches.length,
        tipsReceived: tipsTotal,
        tipsCurrency,
      },
      research: list.map((row) =>
        toResearchProject(row, readSupportEnabled(row.support_settings)),
      ),
      fundingMatches,
    },
  })
}

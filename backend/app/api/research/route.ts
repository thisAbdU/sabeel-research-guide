import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { toResearchProject } from '@/lib/mappers'

export function OPTIONS() {
  return options()
}

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const published = new URL(request.url).searchParams.get('published')
  let query = auth.supabase.from('research_projects').select('*')

  if (published === 'true') {
    query = query.eq('is_published', true)
  } else {
    query = query.eq('user_id', auth.user.id)
  }

  const { data, error: listError } = await query.order('updated_at', { ascending: false })
  if (listError) return error(listError.message, 500)
  return json({ projects: (data ?? []).map(toResearchProject) })
}

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const body = await readBody<{
    title?: string
    summary?: string
    content?: string
  }>(request)

  const title = body?.title?.trim()
  if (!title) return error('title is required')

  const { data, error: createError } = await auth.supabase
    .from('research_projects')
    .insert({
      user_id: auth.user.id,
      title,
      summary: body?.summary?.trim() || null,
      content: body?.content?.trim() || null,
    })
    .select('*')
    .single()

  if (createError || !data) return error(createError?.message ?? 'Could not create project', 500)
  return json({ project: toResearchProject(data) }, 201)
}

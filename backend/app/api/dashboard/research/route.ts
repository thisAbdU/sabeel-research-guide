import { requireUser } from '@/lib/auth'
import { error, json, options } from '@/lib/http'
import { readSupportEnabled } from '@/lib/research'

export function OPTIONS() {
  return options()
}

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const { data, error: listError } = await auth.supabase
    .from('research_projects')
    .select('id, title, is_published, created_at, support_settings(enabled)')
    .eq('user_id', auth.user.id)
    .order('updated_at', { ascending: false })

  if (listError) return error(listError.message, 500)

  return json({
    data: {
      research: (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        visibility: row.is_published ? 'public' : 'private',
        supportEnabled: readSupportEnabled(row.support_settings),
        createdAt: row.created_at,
      })),
    },
  })
}

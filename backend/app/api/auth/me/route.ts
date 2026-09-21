import { requireUser } from '@/lib/auth'
import { json, options } from '@/lib/http'
import { toPublicUser } from '@/lib/mappers'

export function OPTIONS() {
  return options()
}

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const { data: profile } = await auth.supabase
    .from('users')
    .select('display_name')
    .eq('id', auth.user.id)
    .maybeSingle()

  return json({ user: toPublicUser(auth.user, profile) })
}

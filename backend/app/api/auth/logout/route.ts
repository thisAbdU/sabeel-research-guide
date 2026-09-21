import { requireUser } from '@/lib/auth'
import { json, options } from '@/lib/http'

export function OPTIONS() {
  return options()
}

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  await auth.supabase.auth.signOut()
  return json({ ok: true })
}

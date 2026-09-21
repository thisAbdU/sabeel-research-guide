import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseClient } from '@/lib/supabase/server'
import { error } from '@/lib/http'

export function bearerToken(request: Request) {
  const header = request.headers.get('authorization')
  if (!header?.toLowerCase().startsWith('bearer ')) return null
  const token = header.slice(7).trim()
  return token || null
}

export async function requireUser(request: Request): Promise<
  | { ok: true; user: User; supabase: SupabaseClient }
  | { ok: false; response: Response }
> {
  const token = bearerToken(request)
  if (!token) return { ok: false, response: error('Unauthorized', 401) }

  const supabase = createSupabaseClient(token)
  const { data, error: authError } = await supabase.auth.getUser(token)
  if (authError || !data.user) {
    return { ok: false, response: error('Unauthorized', 401) }
  }

  return { ok: true, user: data.user, supabase }
}

import { createSupabaseClient } from '@/lib/supabase/server'
import { error, json, options, readBody } from '@/lib/http'
import { toPublicUser, toSession } from '@/lib/mappers'
import type { AuthResponse } from '@/lib/types'

export function OPTIONS() {
  return options()
}

export async function POST(request: Request) {
  const body = await readBody<{ email?: string; password?: string }>(request)
  const email = body?.email?.trim()
  const password = body?.password
  if (!email || !password) return error('email and password are required')

  const supabase = createSupabaseClient()
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError || !data.user || !data.session) {
    return error(signInError?.message ?? 'Invalid credentials', 401)
  }

  const userClient = createSupabaseClient(data.session.access_token)
  const { data: profile } = await userClient
    .from('users')
    .select('display_name')
    .eq('id', data.user.id)
    .maybeSingle()

  const response: AuthResponse = {
    user: toPublicUser(data.user, profile),
    session: toSession(data.session),
  }

  return json(response)
}

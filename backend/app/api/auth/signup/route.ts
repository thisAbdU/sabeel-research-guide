import { createSupabaseClient } from '@/lib/supabase/server'
import { error, json, options, readBody } from '@/lib/http'
import { toPublicUser, toSession } from '@/lib/mappers'
import type { AuthResponse } from '@/lib/types'

export function OPTIONS() {
  return options()
}

export async function POST(request: Request) {
  const body = await readBody<{
    email?: string
    password?: string
    displayName?: string
  }>(request)

  const email = body?.email?.trim()
  const password = body?.password
  if (!email || !password) return error('email and password are required')
  if (password.length < 6) return error('password must be at least 6 characters')

  const supabase = createSupabaseClient()
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: body?.displayName?.trim() || email.split('@')[0] },
    },
  })

  if (signUpError || !data.user) return error(signUpError?.message ?? 'Could not sign up')

  const response: AuthResponse = {
    user: toPublicUser(data.user, null),
    session: data.session ? toSession(data.session) : null,
  }

  return json(response, 201)
}

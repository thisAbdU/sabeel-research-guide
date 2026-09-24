import { createSupabaseClient } from '@/lib/supabase/server'
import { error, json, options, readBody } from '@/lib/http'
import { toPublicUser, toSession } from '@/lib/mappers'
import type { AuthResponse } from '@/lib/types'
import { setAuthCookies } from '@/lib/auth-cookies'

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
  const displayName = body?.displayName?.trim() || email?.split('@')[0]
  if (!email || !password) return error('email and password are required')
  if (password.length < 6) return error('password must be at least 6 characters')

  const supabase = createSupabaseClient()
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  })

  if (signUpError || !data.user) {
    return error(signUpError?.message ?? 'Could not sign up', 400)
  }

  const response: AuthResponse = {
    user: toPublicUser(data.user, null),
    session: data.session ? toSession(data.session) : null,
  }

  const responseObject = json(response, 201)

  if (data.session) {
    setAuthCookies(
      responseObject,
      data.session.access_token,
      data.session.refresh_token
    )
  }

  return responseObject
}

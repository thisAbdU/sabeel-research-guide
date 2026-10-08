import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseClient } from '@/lib/supabase/server'
import { error } from '@/lib/http'
import { getAuthCookies, persistAuthCookies } from "@/lib/auth-cookies"

async function userFromAccessToken(accessToken: string): Promise<{
  user: User
  supabase: SupabaseClient
} | null> {
  const supabase = createSupabaseClient(accessToken)
  const { data, error: authError } = await supabase.auth.getUser(accessToken)
  if (authError || !data.user) return null
  return { user: data.user, supabase }
}

async function refreshFromToken(refreshToken: string): Promise<{
  user: User
  supabase: SupabaseClient
} | null> {
  const anon = createSupabaseClient()
  const { data, error: refreshError } = await anon.auth.refreshSession({
    refresh_token: refreshToken,
  })
  if (refreshError || !data.session?.access_token || !data.user) {
    console.error("RequireUser refresh failed:", refreshError?.message)
    return null
  }

  await persistAuthCookies(
    data.session.access_token,
    data.session.refresh_token
  )

  return {
    user: data.user,
    supabase: createSupabaseClient(data.session.access_token),
  }
}

export async function requireUser(
  request: Request
): Promise<
  | {
      ok: true
      user: User
      supabase: SupabaseClient
    }
  | {
      ok: false
      response: Response
    }
> {
  const { accessToken: cookieToken, refreshToken } = getAuthCookies(request)
  const authHeader = request.headers.get("authorization")
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null
  const accessToken = cookieToken || bearerToken

  if (accessToken) {
    const authed = await userFromAccessToken(accessToken)
    if (authed) return { ok: true, ...authed }
    console.error("RequireUser access token rejected; trying refresh")
  }

  // Access cookie Max-Age is 1h; refresh cookie lasts 30d. After expiry the
  // browser stops sending access, middleware still sees refresh, and we rotate.
  if (refreshToken) {
    const refreshed = await refreshFromToken(refreshToken)
    if (refreshed) return { ok: true, ...refreshed }
  }

  return {
    ok: false,
    response: error("Unauthorized", 401),
  }
}

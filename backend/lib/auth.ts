import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseClient } from '@/lib/supabase/server'
import { error } from '@/lib/http'
import { getAuthCookies } from "@/lib/auth-cookies"

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
  const { accessToken } = getAuthCookies(request)

  if (!accessToken) {
    return {
      ok: false,
      response: error("Unauthorized", 401),
    }
  }

  const supabase = createSupabaseClient(accessToken)

  const {
    data,
    error: authError,
  } = await supabase.auth.getUser(accessToken)

  if (authError || !data.user) {
    console.error("RequireUser failed validation:", authError?.message)
    return {
      ok: false,
      response: error("Unauthorized", 401),
    }
  }

  return {
    ok: true,
    user: data.user,
    supabase,
  }
}

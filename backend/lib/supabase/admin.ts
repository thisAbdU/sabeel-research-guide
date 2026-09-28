import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { error } from '@/lib/http'

export function requireAdminClient() {
  const admin = createSupabaseAdminClient()
  if (!admin) {
    return { ok: false as const, response: error('Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY', 500) }
  }
  return { ok: true as const, supabase: admin }
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseEnv } from '@/lib/env'

export function createSupabaseClient(accessToken?: string): SupabaseClient {
  const { url, anonKey } = supabaseEnv()

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  })
}

export function createSupabaseAdminClient(): SupabaseClient | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return null
  const { url } = supabaseEnv()

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

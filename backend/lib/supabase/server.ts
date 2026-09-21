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

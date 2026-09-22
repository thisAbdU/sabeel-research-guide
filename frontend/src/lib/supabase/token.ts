import { supabase } from "@/lib/supabase/client";

/**
 * Retrieves the active Supabase JWT access token for authenticating backend API requests.
 * Format expected by backend: Authorization: Bearer <access_token>
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch (error) {
    console.error("Failed to retrieve Supabase session access token:", error);
    return null;
  }
}

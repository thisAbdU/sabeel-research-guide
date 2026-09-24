import { clearAuthCookies } from '@/lib/auth-cookies'
import { json, options } from '@/lib/http'

export function OPTIONS() {
  return options()
}

export async function POST() {
  const response = json({ ok: true })

  clearAuthCookies(response)

  return response
}
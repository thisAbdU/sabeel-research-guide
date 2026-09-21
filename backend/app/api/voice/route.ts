import { requireUser } from '@/lib/auth'
import { error, options } from '@/lib/http'

export function OPTIONS() {
  return options()
}

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  // ponytail: route exists for Person A; wire STT/TTS when voice is in scope
  return error('Voice is not implemented yet', 501)
}

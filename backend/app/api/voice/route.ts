import { requireUser } from '@/lib/auth'
import { error, options } from '@/lib/http'

export function OPTIONS() {
  return options()
}

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  // Voice STT/TTS is client-side via @voxide/react (see frontend useVoicePipeline).
  // This route is unused by the supported hackathon integration path.
  return error('Voice runs in the browser via Voxide SDK, not this endpoint', 501)
}

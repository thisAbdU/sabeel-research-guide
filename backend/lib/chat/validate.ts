import type { ChatMode } from '@/lib/types'

const MODES: ChatMode[] = ['vent', 'roast', 'funding']
const MAX_MESSAGE_LENGTH = 8000

export function validateChatRequest(body: unknown):
  | { ok: true; mode: ChatMode; message: string; conversationId: string | null }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid JSON body' }

  const { mode, message, conversationId } = body as Record<string, unknown>

  if (typeof mode !== 'string' || !MODES.includes(mode as ChatMode)) {
    return { ok: false, error: 'mode must be vent, roast, or funding' }
  }

  if (typeof message !== 'string') return { ok: false, error: 'message is required' }
  const trimmed = message.trim()
  if (!trimmed) return { ok: false, error: 'message is required' }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `message must be at most ${MAX_MESSAGE_LENGTH} characters` }
  }

  if (conversationId != null && typeof conversationId !== 'string') {
    return { ok: false, error: 'conversationId must be a string or null' }
  }

  return {
    ok: true,
    mode: mode as ChatMode,
    message: trimmed,
    conversationId: conversationId?.trim() || null,
  }
}

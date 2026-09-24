import { requireUser } from '@/lib/auth'
import { completeChat, type ChatTurn } from '@/lib/ai/complete'
import { validateChatRequest } from '@/lib/chat/validate'
import { error, json, options, readBody } from '@/lib/http'
import { toConversation, toMessage } from '@/lib/mappers'
import type { ChatMode, ChatResponse } from '@/lib/types'

const CONTEXT_LIMIT = 20

export function OPTIONS() {
  return options()
}

export async function GET(request: Request) {
  console.log("the request ->", request)
  const auth = await requireUser(request)
  console.log("auth", auth)
  if (!auth.ok) return auth.response

  const conversationId = new URL(request.url).searchParams.get('conversationId')

  if (conversationId) {
    const { data: conversation, error: conversationError } = await auth.supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()

    if (conversationError) return error(conversationError.message, 500)
    if (!conversation) return error('Conversation not found', 404)

    const { data: messages, error: messagesError } = await auth.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (messagesError) return error(messagesError.message, 500)

    return json({
      conversation: toConversation(conversation),
      messages: (messages ?? []).map(toMessage),
    })
  }

  const { data, error: listError } = await auth.supabase
    .from('conversations')
    .select('*')
    .eq('user_id', auth.user.id)
    .order('updated_at', { ascending: false })

  if (listError) return error(listError.message, 500)
  return json({ conversations: (data ?? []).map(toConversation) })
}

export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const parsed = validateChatRequest(await readBody(request))
  if (!parsed.ok) return error(parsed.error)

  let conversationId = parsed.conversationId
  let mode: ChatMode = parsed.mode
  let history: ChatTurn[] = []

  if (conversationId) {
    const { data: existing, error: existingError } = await auth.supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()

    if (existingError) return error(existingError.message, 500)
    if (!existing) return error('Conversation not found', 404)
    if (existing.mode !== parsed.mode) {
      return error(`This conversation is in ${existing.mode} mode`)
    }
    mode = existing.mode

    const { data: prior, error: historyError } = await auth.supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: false })
      .limit(CONTEXT_LIMIT)

    if (historyError) return error(historyError.message, 500)
    history = (prior ?? []).reverse() as ChatTurn[]
  }

  let assistant
  try {
    assistant = await completeChat(mode, history, parsed.message)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI provider failed'
    const missingKey = message.includes('AI_API_KEY')
    return error(missingKey ? 'AI is not configured' : 'AI provider failed', missingKey ? 503 : 502)
  }

  if (!conversationId) {
    const { data: created, error: createError } = await auth.supabase
      .from('conversations')
      .insert({
        user_id: auth.user.id,
        mode,
        title: parsed.message.slice(0, 80),
      })
      .select('id')
      .single()

    if (createError || !created) return error(createError?.message ?? 'Could not create conversation', 500)
    conversationId = created.id
  }

  if (!conversationId) return error('Could not create conversation', 500)

  if (parsed.conversationId) {
    await auth.supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
  }

  const { data: rows, error: persistError } = await auth.supabase
    .from('messages')
    .insert([
      { conversation_id: conversationId, role: 'user', content: parsed.message },
      { conversation_id: conversationId, role: 'assistant', content: assistant.content },
    ])
    .select('id, role, content, created_at')

  if (persistError || !rows) return error(persistError?.message ?? 'Could not save messages', 500)

  const saved = rows.find((row) => row.role === 'assistant')
  if (!saved) return error('Could not save assistant message', 500)

  const response: ChatResponse = {
    data: {
      conversationId,
      message: {
        id: saved.id,
        role: 'assistant',
        content: saved.content,
        createdAt: saved.created_at,
      },
      sources: assistant.sources,
      researchDirections: assistant.researchDirections,
    },
  }

  return json(response)
}

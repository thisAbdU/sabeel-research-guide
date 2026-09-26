import { requireUser } from '@/lib/auth'
import { completeChat, type ChatTurn } from '@/lib/ai/complete'
import { validateChatRequest } from '@/lib/chat/validate'
import { error, json, options, readBody } from '@/lib/http'
import { toConversation, toMessage } from '@/lib/mappers'
import type { ChatMode, ChatResponse } from '@/lib/types'

const CONTEXT_LIMIT = 20

// ponytail: idle dev proxy drops the socket around 30s; spaces are valid JSON whitespace
function streamJson(work: (status: (text: string) => void) => Promise<unknown>) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text))
      const status = (text: string) => send(`${JSON.stringify({ status: text })}\n`)
      console.info('[chat] response stream opened')
      const beat = setInterval(() => {
        try {
          send('\n')
        } catch {
          clearInterval(beat)
        }
      }, 3000)
      try {
        const payload = await work(status)
        clearInterval(beat)
        send(`${JSON.stringify(payload)}\n`)
        controller.close()
      } catch (err) {
        clearInterval(beat)
        const message = err instanceof Error ? err.message : 'AI provider failed'
        console.error('[chat] stream failed', message)
        send(`${JSON.stringify({ error: message.slice(0, 500) })}\n`)
        controller.close()
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}

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
  console.info('[chat] request received')
  const auth = await requireUser(request)
  if (!auth.ok) {
    console.warn('[chat] auth rejected')
    return auth.response
  }

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

  request.signal.addEventListener('abort', () => {
    console.warn('[chat] client aborted the request')
  })

  return streamJson(async (status) => {
    let assistant
    const started = Date.now()
    console.info('[chat] completeChat start', { mode })
    try {
      assistant = await completeChat(mode, history, parsed.message, status)
      console.info('[chat] completeChat done', { mode, ms: Date.now() - started, sources: assistant.sources.length })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI provider failed'
      console.error('[chat] completeChat failed', { mode, ms: Date.now() - started, message })
      const missingKey = message.includes('AI_API_KEY')
      throw new Error(missingKey ? 'AI is not configured' : message.slice(0, 500))
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

      if (createError || !created) throw new Error(createError?.message ?? 'Could not create conversation')
      conversationId = created.id
    }

    if (!conversationId) throw new Error('Could not create conversation')

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

    if (persistError || !rows) throw new Error(persistError?.message ?? 'Could not save messages')

    const saved = rows.find((row) => row.role === 'assistant')
    if (!saved) throw new Error('Could not save assistant message')

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

    return response
  })
}

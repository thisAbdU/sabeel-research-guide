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

const LIST_COLUMNS =
  'id, user_id, research_project_id, mode, title, message_count, last_message_preview, created_at, updated_at'
const DEFAULT_LIST_LIMIT = 30
const MAX_LIST_LIMIT = 50
const DEFAULT_MESSAGE_LIMIT = 50
const MAX_MESSAGE_LIMIT = 100

function parseLimit(raw: string | null, fallback: number, max: number) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(Math.floor(n), max)
}

export async function GET(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const params = new URL(request.url).searchParams
  const conversationId = params.get('conversationId')

  if (conversationId) {
    const messageLimit = parseLimit(
      params.get('limit'),
      DEFAULT_MESSAGE_LIMIT,
      MAX_MESSAGE_LIMIT,
    )
    const before = params.get('before') // ISO timestamp cursor (exclusive)

    const { data: conversation, error: conversationError } = await auth.supabase
      .from('conversations')
      .select(LIST_COLUMNS)
      .eq('id', conversationId)
      .maybeSingle()

    if (conversationError) return error(conversationError.message, 500)
    if (!conversation) return error('Conversation not found', 404)

    let query = auth.supabase
      .from('messages')
      .select('id, conversation_id, role, content, created_at, sources, research_directions')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(messageLimit + 1)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data: rows, error: messagesError } = await query
    if (messagesError) return error(messagesError.message, 500)

    const page = rows ?? []
    const hasMore = page.length > messageLimit
    const slice = hasMore ? page.slice(0, messageLimit) : page
    const messages = slice.reverse().map(toMessage)
    const nextBefore = hasMore && messages.length > 0 ? messages[0].createdAt : null

    return json({
      conversation: toConversation(conversation),
      messages,
      page: { hasMore, nextBefore },
    })
  }

  const listLimit = parseLimit(params.get('limit'), DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT)
  const cursor = params.get('cursor') // ISO updated_at cursor (exclusive)

  let listQuery = auth.supabase
    .from('conversations')
    .select(LIST_COLUMNS)
    .eq('user_id', auth.user.id)
    .order('updated_at', { ascending: false })
    .limit(listLimit + 1)

  if (cursor) {
    listQuery = listQuery.lt('updated_at', cursor)
  }

  const { data, error: listError } = await listQuery
  if (listError) return error(listError.message, 500)

  const page = data ?? []
  const hasMore = page.length > listLimit
  const conversations = (hasMore ? page.slice(0, listLimit) : page).map(toConversation)
  const nextCursor =
    hasMore && conversations.length > 0
      ? conversations[conversations.length - 1].updatedAt
      : null

  return json({ conversations, page: { hasMore, nextCursor } })
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

    const preview = assistant.content.slice(0, 120)
    let messageCount = 2

    if (!conversationId) {
      const { data: created, error: createError } = await auth.supabase
        .from('conversations')
        .insert({
          user_id: auth.user.id,
          mode,
          title: parsed.message.slice(0, 80),
          message_count: 2,
          last_message_preview: preview,
        })
        .select('id')
        .single()

      if (createError || !created) throw new Error(createError?.message ?? 'Could not create conversation')
      conversationId = created.id
    } else {
      const { data: current } = await auth.supabase
        .from('conversations')
        .select('message_count')
        .eq('id', conversationId)
        .maybeSingle()

      messageCount = (current?.message_count ?? 0) + 2

      await auth.supabase
        .from('conversations')
        .update({
          updated_at: new Date().toISOString(),
          message_count: messageCount,
          last_message_preview: preview,
        })
        .eq('id', conversationId)
    }

    if (!conversationId) throw new Error('Could not create conversation')

    const { data: rows, error: persistError } = await auth.supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          role: 'user',
          content: parsed.message,
          sources: [],
          research_directions: [],
        },
        {
          conversation_id: conversationId,
          role: 'assistant',
          content: assistant.content,
          sources: assistant.sources ?? [],
          research_directions: assistant.researchDirections ?? [],
        },
      ])
      .select('id, role, content, created_at, sources, research_directions')

    if (persistError || !rows) throw new Error(persistError?.message ?? 'Could not save messages')

    const savedUser = rows.find((row) => row.role === 'user')
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
        userMessage: savedUser
          ? {
              id: savedUser.id,
              role: 'user' as const,
              content: savedUser.content,
              createdAt: savedUser.created_at,
            }
          : undefined,
        sources: assistant.sources,
        researchDirections: assistant.researchDirections,
        suggestPublish: !!assistant.suggestPublish,
        paper: assistant.paper ?? null,
        conversation: {
          id: conversationId,
          mode,
          title: parsed.conversationId ? undefined : parsed.message.slice(0, 80),
          messageCount,
          lastMessagePreview: preview,
          updatedAt: new Date().toISOString(),
        },
      },
    }

    return response
  })
}

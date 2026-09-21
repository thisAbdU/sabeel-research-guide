import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { toConversation, toMessage } from '@/lib/mappers'
import type { ChatMode } from '@/lib/types'

export function OPTIONS() {
  return options()
}

export async function GET(request: Request) {
  const auth = await requireUser(request)
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

  const body = await readBody<{
    conversationId?: string
    researchProjectId?: string
    mode?: ChatMode
    content?: string
  }>(request)

  const content = body?.content?.trim()
  if (!content) return error('content is required')

  let conversationId = body?.conversationId
  let mode = body?.mode

  if (conversationId) {
    const { data: existing, error: existingError } = await auth.supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()

    if (existingError) return error(existingError.message, 500)
    if (!existing) return error('Conversation not found', 404)
    mode = existing.mode
  } else {
    if (!mode || !['vent', 'roast', 'funding'].includes(mode)) {
      return error('mode must be vent, roast, or funding')
    }

    const { data: created, error: createError } = await auth.supabase
      .from('conversations')
      .insert({
        user_id: auth.user.id,
        research_project_id: body?.researchProjectId ?? null,
        mode,
        title: content.slice(0, 80),
      })
      .select('*')
      .single()

    if (createError || !created) return error(createError?.message ?? 'Could not create conversation', 500)
    conversationId = created.id
  }

  const { data: message, error: messageError } = await auth.supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content,
    })
    .select('*')
    .single()

  if (messageError || !message) return error(messageError?.message ?? 'Could not save message', 500)

  // ponytail: persist only; add model reply when chat generation is wired
  return json({
    conversationId,
    mode,
    message: toMessage(message),
  }, 201)
}

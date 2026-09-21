import { aiEnv } from '@/lib/env'
import { systemPromptFor } from '@/lib/chat/prompts'
import type { ChatMode, MessageRole } from '@/lib/types'

export type ChatTurn = {
  role: Exclude<MessageRole, 'system'>
  content: string
}

type Completion = {
  content: string
  researchDirections: string[]
}

export async function completeChat(mode: ChatMode, history: ChatTurn[], message: string): Promise<Completion> {
  const { baseUrl, apiKey, model } = aiEnv()

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPromptFor(mode) },
        ...history,
        { role: 'user', content: message },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `AI provider returned ${response.status}`)
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const raw = payload.choices?.[0]?.message?.content
  if (!raw) throw new Error('AI provider returned an empty response')

  return parseAssistant(raw)
}

function parseAssistant(raw: string): Completion {
  try {
    const parsed = JSON.parse(raw) as { content?: unknown; researchDirections?: unknown }
    return {
      content: typeof parsed.content === 'string' && parsed.content.trim() ? parsed.content : raw,
      researchDirections: Array.isArray(parsed.researchDirections)
        ? parsed.researchDirections.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 5)
        : [],
    }
  } catch {
    return { content: raw, researchDirections: [] }
  }
}

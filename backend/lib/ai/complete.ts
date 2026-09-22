import { aiEnv } from '@/lib/env'
import { systemPromptFor } from '@/lib/chat/prompts'
import { searchScholarXiv, extractSearchQuery } from '@/lib/scholarxiv'
import type { ChatMode, MessageRole, ResearchDirection, ResearchSource } from '@/lib/types'

export type ChatTurn = {
  role: Exclude<MessageRole, 'system'>
  content: string
}

type Completion = {
  content: string
  researchDirections: ResearchDirection[]
  sources: ResearchSource[]
}

export async function completeChat(mode: ChatMode, history: ChatTurn[], message: string): Promise<Completion> {
  const { baseUrl, apiKey, model } = aiEnv()

  let sources: ResearchSource[] = []
  let enhancedSystemPrompt = systemPromptFor(mode)

  // For vent mode, search ScholarXiv when enough context exists
  if (mode === 'vent' && history.length >= 2) {
    const searchQuery = extractSearchQuery(message, history.map((h) => h.content))
    sources = await searchScholarXiv({ query: searchQuery, limit: 5 })

    if (sources.length > 0) {
      const sourceContext = sources
        .map(
          (source) =>
            `- ${source.title} by ${source.authors.join(', ')}\n  URL: ${source.url}\n  Summary: ${source.summary || 'No summary available'}`
        )
        .join('\n\n')

      enhancedSystemPrompt += `\n\nRESEARCH SOURCES FROM SCHOLARXIV:\n${sourceContext}\n\nUse these sources to ground your research directions. Reference them when relevant. Include these sources in your response's "sources" array exactly as provided above.`
    }
  }

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
        { role: 'system', content: enhancedSystemPrompt },
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

  const parsed = parseAssistant(raw)

  // When ScholarXiv sources are provided, ensure they're included in the response
  // The AI should reference them, but we guarantee they're present
  const finalSources = sources.length > 0 ? sources : parsed.sources

  return {
    ...parsed,
    sources: finalSources,
  }
}

function parseAssistant(raw: string): Completion {
  try {
    const parsed = JSON.parse(raw) as {
      content?: unknown
      researchDirections?: unknown
      sources?: unknown
    }
    return {
      content: typeof parsed.content === 'string' && parsed.content.trim() ? parsed.content : raw,
      researchDirections: Array.isArray(parsed.researchDirections)
        ? parsed.researchDirections
            .filter((item): item is { title?: unknown; description?: unknown; researchQuestion?: unknown } =>
              typeof item === 'object' && item !== null
            )
            .map((item) => ({
              title: typeof item.title === 'string' ? item.title : '',
              description: typeof item.description === 'string' ? item.description : '',
              researchQuestion: typeof item.researchQuestion === 'string' ? item.researchQuestion : '',
            }))
            .filter((dir) => dir.title.trim().length > 0)
            .slice(0, 5)
        : [],
      sources: Array.isArray(parsed.sources)
        ? parsed.sources
            .filter((item): item is { id?: unknown; title?: unknown; authors?: unknown; url?: unknown; source?: unknown } =>
              typeof item === 'object' && item !== null
            )
            .map((item) => ({
              id: typeof item.id === 'string' ? item.id : '',
              title: typeof item.title === 'string' ? item.title : '',
              authors: Array.isArray(item.authors)
                ? item.authors.filter((a): a is string => typeof a === 'string')
                : [],
              url: typeof item.url === 'string' ? item.url : '',
              source: typeof item.source === 'string' ? item.source : 'ScholarXiv',
            }))
            .filter((src) => src.title.trim().length > 0 && src.url.trim().length > 0)
        : [],
    }
  } catch {
    return { content: raw, researchDirections: [], sources: [] }
  }
}

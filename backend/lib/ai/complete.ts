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

function isGreetingOnly(text: string): boolean {
  const trimmed = text.trim()
  return (
    trimmed.length < 4 ||
    /^(hi|hello|hey|yo|greetings|howdy|good\s*(morning|afternoon|evening))[\s.!]*$/i.test(trimmed)
  )
}

export async function completeChat(mode: ChatMode, history: ChatTurn[], message: string): Promise<Completion> {
  const { baseUrl, apiKey, model } = aiEnv()

  let sources: ResearchSource[] = []
  let enhancedSystemPrompt = systemPromptFor(mode)

  // Search ScholarXiv whenever user provides a substantive research thought, topic, or paper reference
  if (!isGreetingOnly(message)) {
    const searchQuery = extractSearchQuery(message, history.map((h) => h.content))
    const limit = mode === 'vent' ? 5 : 3
    sources = await searchScholarXiv({ query: searchQuery, limit })

    if (sources.length > 0) {
      const sourceContext = sources
        .map(
          (source, idx) =>
            `${idx + 1}. Title: "${source.title}"\n   Authors: ${source.authors.join(', ')}\n   URL: ${source.url}\n   Summary: ${source.summary || 'No summary available'}`
        )
        .join('\n\n')

      enhancedSystemPrompt += `\n\nRESEARCH SOURCES FROM SCHOLARXIV:\n${sourceContext}\n\nCRITICAL INSTRUCTIONS FOR CITATIONS & SOURCES:\n1. Ground your exploration and recommendations in these real ScholarXiv literature sources.\n2. Whenever you mention or recommend any paper in your markdown response content, ALWAYS format its title as a clickable markdown link using its exact URL: [Paper Title](URL).\n3. Include these exact sources in your JSON response's "sources" array.`
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

  // When ScholarXiv sources were retrieved, guarantee they are included in the response
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
            .filter((item): item is { id?: unknown; title?: unknown; authors?: unknown; url?: unknown; source?: unknown; year?: unknown } =>
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
              year: typeof item.year === 'string' ? item.year : undefined,
            }))
            .filter((src) => src.title.trim().length > 0)
        : [],
    }
  } catch {
    return { content: raw, researchDirections: [], sources: [] }
  }
}

import { aiEnv } from '@/lib/env'
import { systemPromptFor } from '@/lib/chat/prompts'
import { searchScholarXiv } from '@/lib/scholarxiv'
import { assessVentReadiness, findLastVentQuery } from '@/lib/ai/vent'
import { prepareRoastContext, getRoastPromptEnrichment } from '@/lib/ai/roast'
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
  let allowDirections = true

  if (mode === 'vent') {
    const lastSearchedQuery = findLastVentQuery(history)
    const decision = assessVentReadiness(history, message, lastSearchedQuery)

    if (decision.shouldSearch && decision.query) {
      try {
        sources = await searchScholarXiv({ query: decision.query, limit: 5 })
      } catch (err) {
        console.warn('ScholarXiv search error in Vent mode:', err)
        sources = []
      }

      if (sources.length > 0) {
        const sourceContext = sources
          .map(
            (source, idx) =>
              `${idx + 1}. Title: "${source.title}"\n   Authors: ${source.authors.join(', ')}\n   URL: ${source.url}\n   Summary: ${source.summary || 'No summary available'}`
          )
          .join('\n\n')

        enhancedSystemPrompt += `\n\nRESEARCH SOURCES FROM SCHOLARXIV:\n${sourceContext}\n\nCRITICAL INSTRUCTIONS FOR CITATIONS & SOURCES:\n1. The user's research idea has reached a focused direction: "${decision.focusedDirection || decision.query}".\n2. Ground your exploration and recommendations in these real ScholarXiv literature sources.\n3. For each recommended paper, explain briefly and specifically WHY it is relevant to the researcher's specific question.\n4. Whenever you mention or recommend any paper in your markdown response content, ALWAYS format its title as a clickable markdown link using its exact URL: [Paper Title](URL).\n5. Include these exact sources in your JSON response's "sources" array.\n6. Suggest 2-4 concrete, actionable research directions in the "researchDirections" array.\n7. NEVER claim "there is a research gap" or "no one has studied this" unless strictly supported by the evidence.`
      } else {
        enhancedSystemPrompt += `\n\nNOTE ON LITERATURE SEARCH:\nA literature search for "${decision.focusedDirection || decision.query}" was attempted on ScholarXiv, but no directly matching papers were retrieved (or the search service was temporarily unavailable).\n- Do NOT fabricate or invent papers, authors, or links.\n- State conversationally that you checked the literature but didn't find direct matches right now.\n- Suggest ways the researcher could broaden, reframe, or refine their research question.\n- Keep "sources": [].`
      }
    } else if (decision.state === 'broad') {
      allowDirections = false
      const missing = decision.missingDimensions?.join(', ') || 'target population, specific outcome, or educational setting'
      enhancedSystemPrompt += `\n\nVENT STAGE: NARROWING & CLARIFICATION\nThe user's research idea is currently too broad for an effective literature search.\nMissing dimensions: ${missing}.\n- Do NOT claim you searched ScholarXiv or cite papers.\n- Acknowledge their topic and ask 1–3 targeted, thoughtful narrowing questions to help them define their core phenomenon, population, outcome/variable, or context.\n- Do NOT overwhelm them with a long questionnaire; keep it conversational.\n- Keep "sources": [] and "researchDirections": [].`
    } else if (decision.state === 'conversational') {
      enhancedSystemPrompt += `\n\nVENT STAGE: CONVERSATIONAL CONTINUATION\nThe user is continuing the conversation without changing their core research focus.\n- Respond conversationally to their message.\n- Do NOT perform a new literature search.\n- Maintain previous context and continue developing the research plan or addressing their specific question.\n- Keep "sources": [].`
    }
  } else if (mode === 'roast') {
    const roastContext = await prepareRoastContext(history, message)
    sources = roastContext.sources
    enhancedSystemPrompt += getRoastPromptEnrichment(roastContext)
    if (roastContext.isEmptyTopic) {
      allowDirections = false
    }
  }

  let response = await fetch(`${baseUrl}/chat/completions`, {
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

  // If AI provider failed with json_validate_failed (grammar mismatch), retry without forced grammar
  if (!response.ok && response.status === 400) {
    try {
      const errClone = response.clone()
      const errData = (await errClone.json()) as { error?: { code?: string } }
      if (errData?.error?.code === 'json_validate_failed') {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0.7,
            messages: [
              {
                role: 'system',
                content: `${enhancedSystemPrompt}\n\nIMPORTANT: You must format your response as a valid JSON object matching the requested schema.`,
              },
              ...history,
              { role: 'user', content: message },
            ],
          }),
          signal: AbortSignal.timeout(45_000),
        })
      }
    } catch {
      // Ignore clone parse errors and let the error handling below report original response
    }
  }

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

  // In vent and roast modes, sources must strictly be real ScholarXiv sources (no LLM hallucinations when 0 found)
  const finalSources =
    mode === 'vent' || mode === 'roast'
      ? sources
      : sources.length > 0
        ? sources
        : parsed.sources

  const finalDirections = allowDirections ? parsed.researchDirections : []

  return {
    ...parsed,
    researchDirections: finalDirections,
    sources: finalSources,
  }
}

function parseAssistant(raw: string): Completion {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsedRaw = JSON.parse(cleaned) as unknown
    const parsed = (Array.isArray(parsedRaw) && parsedRaw.length > 0 ? parsedRaw[0] : parsedRaw) as {
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

import { aiEnv } from '@/lib/env'

/** Canonical Discover category chips — must match frontend filters exactly */
export const DISCOVER_FIELDS = [
  'AI & Tech',
  'Education',
  'Healthcare',
  'Agriculture',
  'Economics',
] as const

export type DiscoverField = (typeof DISCOVER_FIELDS)[number]

const FIELD_SET = new Set<string>(DISCOVER_FIELDS)

export function isDiscoverField(value: string): value is DiscoverField {
  return FIELD_SET.has(value)
}

export function normalizeDiscoverField(value: string | null | undefined): DiscoverField | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (isDiscoverField(trimmed)) return trimmed
  const lower = trimmed.toLowerCase()
  for (const field of DISCOVER_FIELDS) {
    if (field.toLowerCase() === lower) return field
  }
  return null
}

/** Fast keyword fallback when the AI call is unavailable */
export function heuristicDiscoverField(title: string, summary = ''): DiscoverField {
  const text = `${title}\n${summary}`.toLowerCase()

  const scores: Record<DiscoverField, number> = {
    'AI & Tech': 0,
    Education: 0,
    Healthcare: 0,
    Agriculture: 0,
    Economics: 0,
  }

  const bump = (field: DiscoverField, weight: number, patterns: RegExp[]) => {
    for (const pattern of patterns) {
      if (pattern.test(text)) scores[field] += weight
    }
  }

  bump('AI & Tech', 3, [
    /\b(artificial intelligence|machine learning|\bai\b|\bml\b|deep learning|llm|nlp|computer vision|software|computing|robotics|cyber|data science|neural)\b/i,
  ])
  bump('Education', 3, [
    /\b(education|learning|teaching|pedagog|school|university|student|curriculum|classroom|instruction|lxd|edtech)\b/i,
  ])
  bump('Healthcare', 3, [
    /\b(health|medical|medicine|clinical|hospital|patient|disease|pharma|epidemiolog|public health|biomed)\b/i,
  ])
  bump('Agriculture', 3, [
    /\b(agricultur|farming|crop|soil|livestock|irrigation|food security|agronom|plant disease)\b/i,
  ])
  bump('Economics', 3, [
    /\b(econom|financ|market|trade|development policy|poverty|microfinanc|labor|employment|gdp)\b/i,
  ])

  let best: DiscoverField = 'AI & Tech'
  let bestScore = -1
  for (const field of DISCOVER_FIELDS) {
    if (scores[field] > bestScore) {
      best = field
      bestScore = scores[field]
    }
  }
  return bestScore > 0 ? best : 'AI & Tech'
}

/**
 * Classify a paper into one Discover chip label via AI, with heuristic fallback.
 */
export async function classifyDiscoverField(input: {
  title: string
  summary?: string | null
  preferred?: string | null
}): Promise<DiscoverField> {
  const preferred = normalizeDiscoverField(input.preferred)
  if (preferred) return preferred

  const title = input.title.trim()
  const summary = (input.summary ?? '').trim().slice(0, 1500)
  const fallback = heuristicDiscoverField(title, summary)

  let baseUrl: string
  let apiKey: string
  let model: string
  try {
    ;({ baseUrl, apiKey, model } = aiEnv())
  } catch {
    return fallback
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You classify academic research into exactly one Discover category.
Allowed values only: ${DISCOVER_FIELDS.map((f) => `"${f}"`).join(', ')}.
Return JSON: {"field":"<one allowed value>"}.`,
          },
          {
            role: 'user',
            content: `Title: ${title}\n\nAbstract: ${summary || '(none)'}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    })

    if (!response.ok) return fallback

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const raw = payload.choices?.[0]?.message?.content ?? ''
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(cleaned) as { field?: unknown }
    const field = typeof parsed.field === 'string' ? normalizeDiscoverField(parsed.field) : null
    return field ?? fallback
  } catch (err) {
    console.warn('[discover] field classification failed, using heuristic', err)
    return fallback
  }
}

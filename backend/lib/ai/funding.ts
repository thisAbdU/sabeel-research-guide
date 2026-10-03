import Exa from 'exa-js'
import type { ChatTurn } from '@/lib/ai/complete'
import type { ResearchSource } from '@/lib/types'
import { extractPaperId, getScholarXivPaper, searchScholarXiv } from '@/lib/scholarxiv'

type Funder = {
  name?: string
  website?: string
  program?: string
  whyMatch?: string
  linkedin?: string
  twitter?: string
}

export const FUNDING_MAX_USER_TURNS = 7
const FORCE_SEARCH_AT_TURN = 6

const EMPTY = `\n\nFUNDING SEARCH:\nNo grounded funding sources were retrieved.\n- Do NOT invent organizations, grants, deadlines, amounts, or links.\n- Say you could not retrieve documented funding sources right now.\n- Keep "sources": [].`

const OUTPUT_SCHEMA = {
  type: 'object',
  required: ['funders'],
  properties: {
    funders: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        required: ['name', 'website', 'whyMatch'],
        properties: {
          name: { type: 'string' },
          website: { type: 'string', format: 'uri' },
          program: { type: 'string' },
          whyMatch: { type: 'string' },
          linkedin: { type: 'string' },
          twitter: { type: 'string' },
        },
      },
    },
  },
}

function asFunders(value: unknown): Funder[] {
  if (!value || typeof value !== 'object') return []
  const funders = (value as { funders?: unknown }).funders
  if (!Array.isArray(funders)) return []
  return funders.filter((item): item is Funder => typeof item === 'object' && item !== null)
}

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function fundingUserTurnCount(history: ChatTurn[], message: string) {
  return history.filter((turn) => turn.role === 'user').length + (message.trim() ? 1 : 0)
}

export function assessFundingReadiness(history: ChatTurn[], message: string) {
  const userTurns = fundingUserTurnCount(history, message)
  const corpus = [...history.map((turn) => turn.content), message].join('\n')
  const hasPaper = !!extractPaperId(corpus)
  const hasGeo =
    /\b(ethiopia|kenya|uganda|tanzania|rwanda|nigeria|ghana|africa|europe|usa|united states|uk|united kingdom|india|asia|latam|latin america)\b/i.test(
      corpus,
    )
  const hasTopic = hasPaper || corpus.replace(/https?:\/\/\S+/gi, '').trim().length >= 60
  const asksToSearch =
    /\b(find|show|list|give|search)\b.{0,40}\b(funder|funders|funding|grants?|sponsors?)\b/i.test(message) ||
    /\b(potential funders|funding matches|continue with funding)\b/i.test(message)

  const shouldSearch =
    asksToSearch ||
    userTurns >= FORCE_SEARCH_AT_TURN ||
    (hasTopic && (hasGeo || hasPaper) && userTurns >= 2)

  return {
    userTurns,
    shouldSearch,
    suggestPublish: userTurns >= FUNDING_MAX_USER_TURNS,
    hasPaper,
  }
}

export function extractFundingQuery(text: string): string | null {
  let cleaned = text.trim()

  cleaned = cleaned.replace(
    /^(?:can\s+you\s+)?(?:please\s+)?(?:find|get|search|look\s+for|suggest)?\s*(?:funding|funders|grants?|fellowships?|investors?|sponsors?)\s+(?:for|to|on)?\s*(?:this|my)?\s*(?:research\s+)?(?:idea|topic|paper|proposal|question|concept|project)?[:\s-]*/i,
    ''
  )
  cleaned = cleaned.replace(/^please\s+find\s+funding[:\s-]*/i, '')
  cleaned = cleaned.replace(
    /^i\s+(?:want\s+to|would\s+like\s+to|need\s+to)\s+(?:find\s+funding|get\s+funding|fund)\s+(?:for|on)?[:\s-]*/i,
    ''
  )
  cleaned = cleaned.replace(
    /^(?:my\s+)?(?:research\s+)?(?:idea|topic|paper|proposal|question|concept|project)[:\s-]*/i,
    ''
  )
  cleaned = cleaned.replace(/^["'“](.*)["'”]$/, '$1').trim()

  if (
    !cleaned ||
    cleaned.length < 3 ||
    /^(?:it|this|that|me|something|anything|idea|topic|paper|research\s+idea)$/i.test(cleaned)
  ) {
    return null
  }

  return cleaned
}

async function resolvePaper(history: ChatTurn[], message: string): Promise<ResearchSource | null> {
  const corpus = [...history.map((turn) => turn.content), message].join('\n')
  const paperId = extractPaperId(message) || extractPaperId(corpus)
  if (paperId) {
    try {
      return await getScholarXivPaper(paperId)
    } catch (err) {
      console.warn('[funding] ScholarXiv paper lookup failed for ID:', paperId, err)
    }
  }

  const cleanedQuery = extractFundingQuery(message)
  if (cleanedQuery && cleanedQuery.length >= 6) {
    try {
      const results = await searchScholarXiv({ query: cleanedQuery, limit: 1 })
      if (results?.[0]) return results[0]
    } catch (err) {
      console.warn('[funding] ScholarXiv topic search failed:', err)
    }
  }
  return null
}

export async function prepareFundingContext(history: ChatTurn[], message: string) {
  const readiness = assessFundingReadiness(history, message)
  const matchedPaper = await resolvePaper(history, message)

  if (!readiness.shouldSearch) {
    const paperBlock = matchedPaper
      ? `\nScholarXiv paper already identified:\n- Title: "${matchedPaper.title}"\n- URL: ${matchedPaper.url}\n- Summary: ${matchedPaper.summary || 'n/a'}\nAcknowledge it briefly.`
      : '\nNo ScholarXiv link confirmed yet. If the user has a ScholarXiv/journal URL, ask them to paste it.'

    const prompt = `\n\nFUNDING STAGE: CLARIFICATION (user turn ${readiness.userTurns}/${FUNDING_MAX_USER_TURNS})
Do NOT list funders, grants, or organizations yet. The backend has not retrieved grounded matches.
Ask at most 1–2 short targeted questions to learn missing pieces: geography/country, population, research stage, or expected impact.
${paperBlock}
Keep "sources": [] and "researchDirections": [].`

    return {
      sources: [] as ResearchSource[],
      prompt,
      paper: matchedPaper,
      readiness,
      stage: 'clarify' as const,
    }
  }

  const apiKey = process.env.EXA_AI_API_KEY
  if (!apiKey) {
    return {
      sources: [] as ResearchSource[],
      prompt: EMPTY,
      paper: matchedPaper,
      readiness: { ...readiness, suggestPublish: true },
      stage: 'search' as const,
    }
  }

  const prior = history
    .filter((turn) => turn.role === 'user')
    .slice(-2)
    .map((turn) => turn.content)
    .join('\n')

  let research = `${prior}\n${message}`.trim().slice(0, 4000)

  if (matchedPaper) {
    research =
      `Paper Title: "${matchedPaper.title}"\nAbstract: ${matchedPaper.summary || 'No abstract available'}\nAuthors: ${matchedPaper.authors.join(', ')}\nPreprint URL: ${matchedPaper.url}\n\nUser Context:\n${message}`
        .trim()
        .slice(0, 4000)
  }

  const exa = new Exa(apiKey)
  const exaStarted = Date.now()
  console.info('[funding] Exa agent start', {
    effort: 'medium',
    chars: research.length,
    paper: matchedPaper?.title,
    userTurns: readiness.userTurns,
  })
  const run = await exa.agent.runs.createAndWait(
    {
      query: `Find publicly documented organizations, foundations, grant programs, or companies that may fund this research. Only include real organizations with official websites.\n\nResearch:\n${research}`,
      systemPrompt:
        'Return potential funding matches only. Do not claim an organization will fund the researcher or that they are eligible. Prefer official program pages over news roundups. When available, provide their LinkedIn or Twitter profile URLs.',
      outputSchema: OUTPUT_SCHEMA,
      effort: 'medium',
    },
    { pollInterval: 2000, timeoutMs: 75_000 },
  )

  const funders = asFunders(run.output?.structured).slice(0, 8)
  console.info('[funding] Exa agent done', {
    ms: Date.now() - exaStarted,
    status: run.status,
    stopReason: run.stopReason,
    funders: funders.length,
  })
  const citations = (run.output?.grounding ?? []).flatMap((entry) => entry.citations ?? [])
  const sources: ResearchSource[] = []
  const seen = new Set<string>()

  for (const citation of citations) {
    if (!citation.url || seen.has(citation.url)) continue
    seen.add(citation.url)
    const funder = funders.find((item) => item.website && host(item.website) === host(citation.url))
    sources.push({
      id: citation.url,
      title: citation.title || funder?.name || citation.url,
      authors: [],
      summary: funder?.whyMatch,
      url: citation.url,
      source: 'Exa',
      program: funder?.program,
      whyMatch: funder?.whyMatch,
      socials: {
        website: funder?.website || citation.url,
        linkedin: funder?.linkedin || undefined,
        twitter: funder?.twitter || undefined,
      },
    })
  }

  for (const funder of funders) {
    if (!funder.website || seen.has(funder.website)) continue
    seen.add(funder.website)
    sources.push({
      id: funder.website,
      title: funder.program ? `${funder.name ?? 'Funder'} — ${funder.program}` : funder.name || funder.website,
      authors: [],
      summary: funder.whyMatch,
      url: funder.website,
      source: 'Exa',
      program: funder.program,
      whyMatch: funder.whyMatch,
      socials: {
        website: funder.website,
        linkedin: funder.linkedin || undefined,
        twitter: funder.twitter || undefined,
      },
    })
  }

  if (sources.length === 0) {
    return {
      sources,
      prompt: EMPTY,
      paper: matchedPaper,
      readiness: { ...readiness, suggestPublish: true },
      stage: 'search' as const,
    }
  }

  const list = funders
    .map((funder, index) => {
      const lines = [
        `${index + 1}. Organization: ${funder.name ?? 'Unknown'}`,
        funder.program ? `   Program: ${funder.program}` : '',
        funder.whyMatch ? `   Why it may match: ${funder.whyMatch}` : '',
        funder.website ? `   Website: ${funder.website}` : '',
      ]
      return lines.filter(Boolean).join('\n')
    })
    .join('\n')

  const pages = sources
    .map((source, index) => `${index + 1}. ${source.title}\n   URL: ${source.url}\n   Note: ${source.summary || 'No excerpt'}`)
    .join('\n')

  const prompt = `\n\nGROUNDED FUNDING MATCHES FROM EXA:\n${list}\n\nSOURCE PAGES:\n${pages}\n\nThe interface already shows these funders as cards. Do not list them again. Do not use headings, bullets, or numbered questions.\nWrite exactly one short sentence inviting them to publish this ScholarXiv research on Discover so readers can tip/support them after reviewing funder matches.\nKeep "sources": [] and "researchDirections": [].`

  return {
    sources,
    prompt,
    paper: matchedPaper,
    readiness: { ...readiness, suggestPublish: true },
    stage: 'search' as const,
  }
}

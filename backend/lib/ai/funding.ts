import Exa from 'exa-js'
import type { ChatTurn } from '@/lib/ai/complete'
import type { ResearchSource } from '@/lib/types'

type Funder = {
  name?: string
  website?: string
  program?: string
  whyMatch?: string
}

const EMPTY = `\n\nFUNDING SEARCH:\nNo grounded funding sources were retrieved.\n- Do NOT invent organizations, grants, deadlines, amounts, or links.\n- Say you could not retrieve documented funding sources right now.\n- Keep "sources": [].`

// ponytail: effort medium, not auto — auto runs longer and bills more; raise it if lists stay thin
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

export async function prepareFundingContext(history: ChatTurn[], message: string) {
  const apiKey = process.env.EXA_AI_API_KEY
  if (!apiKey) return { sources: [] as ResearchSource[], prompt: EMPTY }

  const prior = history
    .filter((turn) => turn.role === 'user')
    .slice(-2)
    .map((turn) => turn.content)
    .join('\n')
  const research = `${prior}\n${message}`.trim().slice(0, 4000)

  const exa = new Exa(apiKey)
  const exaStarted = Date.now()
  console.info('[funding] Exa agent start', { effort: 'medium', chars: research.length })
  const run = await exa.agent.runs.createAndWait(
    {
      query: `Find publicly documented organizations, foundations, grant programs, or companies that may fund this research. Only include real organizations with official websites.\n\nResearch:\n${research}`,
      systemPrompt:
        'Return potential funding matches only. Do not claim an organization will fund the researcher or that they are eligible. Prefer official program pages over news roundups.',
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
    })
  }

  if (sources.length === 0) return { sources, prompt: EMPTY }

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

  const prompt = `\n\nGROUNDED FUNDING MATCHES FROM EXA:\n${list}\n\nSOURCE PAGES:\n${pages}\n\nThe interface already shows these funders as cards. Do not list them again. Do not use headings, bullets, or numbered questions.\nWrite exactly one sentence naming the single missing detail that would make the next search sharper, such as a country, a population, or an outcome.\nKeep "sources": [] and "researchDirections": [].`

  return { sources, prompt }
}

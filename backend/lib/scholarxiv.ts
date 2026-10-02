import https from 'node:https'
import { scholarxivEnv } from '@/lib/env'
import type { ResearchSource } from '@/lib/types'

export type ScholarXivPaper = {
  id: string
  extractedID: string
  title: string
  summary: string
  authors: string[]
  published: string
  updated?: string
  primaryCategory?: string
  category?: string[]
  pdfLink?: string
  absLink?: string
  doi?: string
  journalRef?: string
  comment?: string
  reportNo?: string
  submitter?: string
  authorsRaw?: string
}

export type ScholarXivSearchParams = {
  query: string
  limit?: number
  page?: number
}

export type ScholarXivResponse = {
  data: ScholarXivPaper[]
  pagination: {
    page: number
    limit: number
    hasMore: boolean
    nextPage: number | null
  }
}

const SCHOLARXIV_URL_REGEX =
  /(?:https?:\/\/)?(?:www\.)?scholarxiv\.com\/(?:abs|pdf|journal)\/((?:sx\.)?[0-9]+\.[0-9]+(?:v[0-9]+)?)/i

const ARXIV_URL_REGEX =
  /(?:https?:\/\/)?(?:www\.)?arxiv\.org\/(?:abs|pdf)\/([0-9]+\.[0-9]+(?:v[0-9]+)?)/i

const BARE_ID_REGEX = /\b((?:sx\.)?[0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)\b/

/**
 * Extract canonical arXiv/ScholarXiv paper ID from a string, URL, or identifier.
 * Supports:
 * - ScholarXiv journal URL (https://www.scholarxiv.com/journal/sx.2610.00001)
 * - ScholarXiv abs URL (https://www.scholarxiv.com/abs/2401.01234)
 * - ScholarXiv pdf URL (https://www.scholarxiv.com/pdf/2401.01234)
 * - arXiv abs URL (https://arxiv.org/abs/2401.01234)
 * - arXiv pdf URL (https://arxiv.org/pdf/2401.01234)
 * - Bare IDs (2401.01234, sx.2610.00001)
 * - Versioned IDs (2401.01234v1, sx.2610.00001v1)
 */
export function extractPaperId(input: string): string | null {
  if (!input || typeof input !== 'string') return null
  const trimmed = input.trim()

  const sxvMatch = trimmed.match(SCHOLARXIV_URL_REGEX)
  if (sxvMatch && sxvMatch[1]) return sxvMatch[1]

  const arxivMatch = trimmed.match(ARXIV_URL_REGEX)
  if (arxivMatch && arxivMatch[1]) return arxivMatch[1]

  const bareMatch = trimmed.match(BARE_ID_REGEX)
  if (bareMatch && bareMatch[1]) return bareMatch[1]

  return null
}

/**
 * Normalize ScholarXiv results to the standard ResearchSource format.
 * Preserves existing ResearchSource shape and avoids leaking raw internal API fields.
 */
function normalizeScholarXivResults(papers: ScholarXivPaper[]): ResearchSource[] {
  return papers
    .filter(
      (paper) =>
        paper &&
        typeof paper === 'object' &&
        typeof paper.title === 'string' &&
        paper.title.trim().length > 0
    )
    .map((paper) => {
      const paperId = paper.extractedID || paper.id
      const fallbackUrl = paperId
        ? paperId.startsWith('sx.')
          ? `https://www.scholarxiv.com/journal/${paperId}`
          : `https://www.scholarxiv.com/abs/${paperId}`
        : ''
      const url = paper.absLink || paper.pdfLink || fallbackUrl

      let year: string | undefined
      if (paper.published) {
        const parsedYear = new Date(paper.published).getFullYear()
        if (!isNaN(parsedYear)) {
          year = parsedYear.toString()
        }
      }

      return {
        id: paper.extractedID || paper.id || `sxv-${Math.random().toString(36).slice(2, 9)}`,
        title: paper.title.trim(),
        authors: Array.isArray(paper.authors)
          ? paper.authors.filter((a): a is string => typeof a === 'string')
          : [],
        summary: typeof paper.summary === 'string' ? paper.summary : '',
        url: url.trim(),
        source: 'ScholarXiv',
        year,
      }
    })
    .filter((source) => source.url.length > 0)
}

/**
 * Search ScholarXiv for relevant academic papers.
 * Performs a fielded POST search across titles, abstracts, authors, and categories.
 */
export async function searchScholarXiv(params: ScholarXivSearchParams): Promise<ResearchSource[]> {
  const { baseUrl, apiKey } = scholarxivEnv()

  if (!apiKey) {
    console.warn('ScholarXiv API key not configured, returning empty results')
    return []
  }

  const query = params.query?.trim()
  if (!query) return []

  const requestedLimit = typeof params.limit === 'number' && params.limit > 0 ? params.limit : 5
  const page = typeof params.page === 'number' && params.page >= 0 ? params.page : 0

  const requestBody = {
    searchFilterString: {
      all: query,
    },
    page,
    limit: requestedLimit,
    sortBy: 'relevance',
    sortOrder: 'descending',
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/papers/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30_000),
    })

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      console.warn(`ScholarXiv rate limited (429). Retry-After: ${retryAfter ?? 'unknown'}s`)
      return []
    }

    if (!response.ok) {
      console.error(`ScholarXiv API error: ${response.status}`)
      return []
    }

    const json = (await response.json()) as Partial<ScholarXivResponse>
    if (!json || typeof json !== 'object' || !Array.isArray(json.data)) {
      return []
    }

    return normalizeScholarXivResults(json.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`ScholarXiv search failed: ${message}`)
    return []
  }
}

/**
 * Fetch and extract metadata from a ScholarXiv journal paper page.
 * Preprints published via the ScholarXiv journal (e.g. sx.2610.00001) expose
 * highwire citation meta tags and JSON-LD structured data.
 */
export async function fetchScholarXivJournalPaper(idOrUrl: string): Promise<ResearchSource | null> {
  const match = idOrUrl.match(/(?:sx\.\d{4}\.\d{4,5}(?:v\d+)?)/i)
  const id = match ? match[0] : idOrUrl.trim()
  const url = idOrUrl.startsWith('http') ? idOrUrl : `https://www.scholarxiv.com/journal/${id}`

  try {
    const html = await new Promise<string>((resolve) => {
      const req = https.get(
        url,
        {
          maxHeaderSize: 65536,
          headers: { 'User-Agent': 'ScholarXiv-Companion/1.0 (Research Assistant)' },
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 400) {
            return resolve('')
          }
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => resolve(data))
        }
      )
      req.on('error', () => resolve(''))
      req.setTimeout(10_000, () => {
        req.destroy()
        resolve('')
      })
    })

    if (!html) return null

    // 1. Try JSON-LD structured metadata
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)
    let jsonLd: any = null
    if (jsonLdMatch) {
      try {
        jsonLd = JSON.parse(jsonLdMatch[1])
      } catch {}
    }

    // 2. Highwire & Dublin Core Meta tags
    const titleMatch = html.match(/<meta name="(?:citation_title|DC\.title)" content="([^"]+)"/i)
    const authorMatches = [...html.matchAll(/<meta name="(?:citation_author|DC\.creator)" content="([^"]+)"/gi)].map(
      (m) => m[1]
    )
    const dateMatch = html.match(/<meta name="(?:citation_publication_date|DC\.date)" content="([^"]+)"/i)

    const title = jsonLd?.headline || jsonLd?.name || titleMatch?.[1]
    if (!title || typeof title !== 'string') return null

    const summary = jsonLd?.abstract || ''
    const authors =
      jsonLd?.author && Array.isArray(jsonLd.author)
        ? jsonLd.author.map((a: any) => a.name).filter(Boolean)
        : authorMatches
    const year = dateMatch
      ? dateMatch[1].split(/[-/]/)[0]
      : jsonLd?.datePublished
      ? jsonLd.datePublished.slice(0, 4)
      : undefined

    return {
      id,
      title: title.trim(),
      summary: summary.trim(),
      authors,
      year,
      url,
      source: 'ScholarXiv',
    }
  } catch (err) {
    console.warn(`Failed to fetch ScholarXiv journal paper ${id}:`, err)
    return null
  }
}

/**
 * Retrieve a specific paper by exact ID or URL from ScholarXiv using POST searchFilterString.id or Journal lookup.
 */
export async function getScholarXivPaper(paperIdOrUrl: string): Promise<ResearchSource | null> {
  if (!paperIdOrUrl || typeof paperIdOrUrl !== 'string') {
    return null
  }

  const paperId = extractPaperId(paperIdOrUrl) || paperIdOrUrl.trim()
  if (!paperId) return null

  // If this is a ScholarXiv journal paper or URL, fetch the journal metadata directly
  if (paperId.startsWith('sx.') || paperIdOrUrl.includes('/journal/')) {
    const journalPaper = await fetchScholarXivJournalPaper(paperIdOrUrl)
    if (journalPaper) return journalPaper
  }

  const { baseUrl, apiKey } = scholarxivEnv()

  if (!apiKey) {
    console.warn('ScholarXiv API key not configured, returning null')
    return null
  }

  const requestBody = {
    searchFilterString: {
      id: paperId,
    },
    limit: 1,
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/papers/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30_000),
    })

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      console.warn(`ScholarXiv rate limited (429). Retry-After: ${retryAfter ?? 'unknown'}s`)
      return null
    }

    if (!response.ok) {
      console.error(`ScholarXiv paper retrieval error: ${response.status}`)
      return null
    }

    const json = (await response.json()) as Partial<ScholarXivResponse>
    if (!json || typeof json !== 'object' || !Array.isArray(json.data) || json.data.length === 0) {
      // Fallback: if search API yielded nothing but ID could be a journal paper
      if (paperId.includes('.')) {
        const fallbackJournal = await fetchScholarXivJournalPaper(paperId)
        if (fallbackJournal) return fallbackJournal
      }
      return null
    }

    const normalized = normalizeScholarXivResults(json.data)
    return normalized[0] ?? null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`ScholarXiv paper retrieval failed: ${message}`)
    return null
  }
}

/**
 * Extract clean search terms from a user message.
 */
export function extractSearchQuery(message: string, context?: string[]): string {
  const paperId = extractPaperId(message)
  if (paperId) return paperId

  let cleaned = message.trim()

  cleaned = cleaned.replace(
    /^(i want to (study|research|explore|look into|understand|investigate)|i'm interested in|i am interested in|can you (help me with|recommend papers for|find papers on|suggest papers about)|what does (the )?research say about|my research (idea|topic|area) is)\s+/i,
    ''
  )

  cleaned = cleaned.replace(/[?!.]+$/, '').trim()

  return cleaned.slice(0, 300) || message.trim().slice(0, 300)
}

import type { ResearchSource } from '@/lib/types'

type ScholarXivPaper = {
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

type ScholarXivSearchParams = {
  query: string
  limit?: number
  page?: number
}

type ScholarXivResponse = {
  data: ScholarXivPaper[]
  pagination: {
    page: number
    limit: number
    hasMore: boolean
    nextPage: number | null
  }
}

/**
 * ScholarXiv integration for research paper search and retrieval.
 *
 * Base URL: https://www.scholarxiv.com (MUST include www to avoid 307 redirect which strips Authorization header)
 * Endpoint: POST /api/v1/papers/search
 * Authentication: Bearer token or x-api-key header
 */
export async function searchScholarXiv(params: ScholarXivSearchParams): Promise<ResearchSource[]> {
  const SCHOLARXIV_API_URL = 'https://www.scholarxiv.com'
  const SCHOLARXIV_API_KEY = process.env.SCHOLARXIV_API_KEY

  if (!SCHOLARXIV_API_KEY) {
    console.warn('ScholarXiv API key not configured, returning empty results')
    return []
  }

  const query = params.query.trim()
  if (!query) return []

  try {
    const paperId = extractPaperId(query)
    const filter = paperId ? { id: paperId } : { all: query }

    const response = await fetch(`${SCHOLARXIV_API_URL}/api/v1/papers/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SCHOLARXIV_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchFilterString: filter,
        limit: params.limit || 5,
        sortBy: 'relevance',
        sortOrder: 'descending',
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      console.warn(`ScholarXiv rate limited. Retry-After: ${retryAfter} seconds`)
      return []
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error(`ScholarXiv API error: ${response.status} - ${errorText}`)
      return []
    }

    const data = (await response.json()) as ScholarXivResponse
    return normalizeScholarXivResults(data.data || [])
  } catch (error) {
    console.error('ScholarXiv search failed:', error)
    return []
  }
}

/**
 * Retrieve a specific paper by ID or URL from ScholarXiv.
 */
export async function getScholarXivPaper(paperIdOrUrl: string): Promise<ResearchSource | null> {
  const SCHOLARXIV_API_KEY = process.env.SCHOLARXIV_API_KEY

  if (!SCHOLARXIV_API_KEY) {
    return null
  }

  const cleanId = extractPaperId(paperIdOrUrl) || paperIdOrUrl.trim()
  if (!cleanId) return null

  try {
    const results = await searchScholarXiv({ query: cleanId, limit: 1 })
    return results[0] || null
  } catch (error) {
    console.error('ScholarXiv paper retrieval failed:', error)
    return null
  }
}

/**
 * Extract canonical arXiv/ScholarXiv paper ID from a string, URL, or identifier.
 */
export function extractPaperId(input: string): string | null {
  if (!input) return null
  const trimmed = input.trim()

  // Matches ScholarXiv URLs: /abs/2401.01234 or /pdf/2401.01234
  const sxvMatch = trimmed.match(/(?:scholarxiv\.com)\/(?:abs|pdf)\/([0-9]+\.[0-9]+(?:v[0-9]+)?)/i)
  if (sxvMatch) return sxvMatch[1]

  // Matches arXiv URLs: /abs/2401.01234 or /pdf/2401.01234
  const arxivMatch = trimmed.match(/(?:arxiv\.org)\/(?:abs|pdf)\/([0-9]+\.[0-9]+(?:v[0-9]+)?)/i)
  if (arxivMatch) return arxivMatch[1]

  // Matches direct arXiv paper ID e.g. 2401.01234 or 2401.01234v1
  const idMatch = trimmed.match(/\b([0-9]{4}\.[0-9]{4,5}(?:v[0-9]+)?)\b/)
  if (idMatch) return idMatch[1]

  return null
}

/**
 * Normalize ScholarXiv results to the standard ResearchSource format.
 */
function normalizeScholarXivResults(papers: ScholarXivPaper[]): ResearchSource[] {
  return papers
    .filter((paper) => paper && paper.title)
    .map((paper) => {
      // Prioritize abstract link, then PDF link, then canonical web link
      const url =
        paper.absLink ||
        paper.pdfLink ||
        (paper.extractedID ? `https://www.scholarxiv.com/abs/${paper.extractedID}` : '')

      let year: string | undefined
      if (paper.published) {
        const parsedYear = new Date(paper.published).getFullYear()
        if (!isNaN(parsedYear)) {
          year = parsedYear.toString()
        }
      }

      return {
        id: paper.extractedID || paper.id || `sxv-${Math.random().toString(36).slice(2, 9)}`,
        title: paper.title,
        authors: Array.isArray(paper.authors) ? paper.authors : [],
        summary: paper.summary || '',
        url,
        source: 'ScholarXiv',
        year,
      }
    })
    .filter((source) => source.url.trim().length > 0)
}

/**
 * Extract search query from user message.
 * Cleans conversational fluff so that the multi-field search matches relevant literature.
 */
export function extractSearchQuery(message: string, context?: string[]): string {
  const paperId = extractPaperId(message)
  if (paperId) return paperId

  let cleaned = message.trim()

  // Remove common conversational prefixes
  cleaned = cleaned.replace(
    /^(i want to (study|research|explore|look into|understand|investigate)|i'm interested in|i am interested in|can you (help me with|recommend papers for|find papers on|suggest papers about)|what does (the )?research say about|my research (idea|topic|area) is)\s+/i,
    ''
  )

  // Remove trailing question marks or punctuation
  cleaned = cleaned.replace(/[?!.]+$/, '').trim()

  return cleaned.slice(0, 300) || message.trim().slice(0, 300)
}

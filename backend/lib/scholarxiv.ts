import type { ResearchSource } from '@/lib/types'

type ScholarXivPaper = {
  id: string
  extractedID: string
  title: string
  summary: string
  authors: string[]
  published: string
  updated?: string
  primaryCategory: string
  category: string[]
  pdfLink: string
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
 * API Documentation: https://scholarxiv.com
 * Base URL: https://scholarxiv.com
 * Authentication: Bearer token or x-api-key header
 */
export async function searchScholarXiv(params: ScholarXivSearchParams): Promise<ResearchSource[]> {
  const SCHOLARXIV_API_URL = 'https://scholarxiv.com'
  const SCHOLARXIV_API_KEY = process.env.SCHOLARXIV_API_KEY

  if (!SCHOLARXIV_API_KEY) {
    console.warn('ScholarXiv API key not configured, returning empty results')
    return []
  }

  try {
    const url = new URL(`${SCHOLARXIV_API_URL}/api/v1/papers/search`)
    url.searchParams.set('q', params.query)
    url.searchParams.set('limit', (params.limit || 10).toString())
    if (params.page !== undefined) {
      url.searchParams.set('page', params.page.toString())
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SCHOLARXIV_API_KEY}`,
      },
      signal: AbortSignal.timeout(30_000),
    })

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      console.warn(`ScholarXiv rate limited. Retry-After: ${retryAfter} seconds`)
      return []
    }

    if (!response.ok) {
      console.error(`ScholarXiv API error: ${response.status}`)
      return []
    }

    const data = (await response.json()) as ScholarXivResponse
    return normalizeScholarXivResults(data.data)
  } catch (error) {
    console.error('ScholarXiv search failed:', error)
    return []
  }
}

/**
 * Retrieve a specific paper by ID from ScholarXiv.
 * Note: The ScholarXiv API is a search-only API, so this uses the search endpoint
 * with the extracted ID to find the specific paper.
 */
export async function getScholarXivPaper(paperId: string): Promise<ResearchSource | null> {
  const SCHOLARXIV_API_KEY = process.env.SCHOLARXIV_API_KEY

  if (!SCHOLARXIV_API_KEY) {
    return null
  }

  try {
    const results = await searchScholarXiv({ query: paperId, limit: 1 })
    return results[0] || null
  } catch (error) {
    console.error('ScholarXiv paper retrieval failed:', error)
    return null
  }
}

/**
 * Normalize ScholarXiv results to the standard ResearchSource format.
 */
function normalizeScholarXivResults(papers: ScholarXivPaper[]): ResearchSource[] {
  return papers
    .filter((paper) => paper.title && paper.pdfLink)
    .map((paper) => ({
      id: paper.extractedID,
      title: paper.title,
      authors: Array.isArray(paper.authors) ? paper.authors : [],
      summary: paper.summary,
      url: paper.pdfLink,
      source: 'ScholarXiv',
    }))
}

/**
 * Extract search query from conversation context for ScholarXiv.
 * This can be enhanced with AI to generate better search queries.
 */
export function extractSearchQuery(message: string, context?: string[]): string {
  // Simple implementation: use the message as the query
  // ⚠️ verify: Enhance with AI to extract better search terms from context
  return message.trim().slice(0, 500)
}

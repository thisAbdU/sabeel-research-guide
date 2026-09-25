import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { searchScholarXiv, getScholarXivPaper, extractPaperId } from '@/lib/scholarxiv'

describe('ScholarXiv Client Unit Tests', () => {
  const originalFetch = globalThis.fetch
  const originalEnvKey = process.env.SCHOLARXIV_API_KEY
  const originalBaseUrl = process.env.SCHOLARXIV_BASE_URL

  beforeEach(() => {
    process.env.SCHOLARXIV_API_KEY = 'sxv_mock_test_key_12345'
    process.env.SCHOLARXIV_BASE_URL = 'https://www.scholarxiv.com'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    process.env.SCHOLARXIV_API_KEY = originalEnvKey
    process.env.SCHOLARXIV_BASE_URL = originalBaseUrl
  })

  // 1. Topic search sends POST
  it('1. Topic search sends POST method', async () => {
    let capturedMethod = ''
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedMethod = init?.method || ''
      return new Response(JSON.stringify({ data: [], pagination: {} }), { status: 200 })
    }) as typeof fetch

    await searchScholarXiv({ query: 'machine learning' })
    assert.equal(capturedMethod, 'POST')
  })

  // 2. Topic search uses searchFilterString.all
  it('2. Topic search uses searchFilterString.all', async () => {
    let capturedBody: any = null
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string)
      return new Response(JSON.stringify({ data: [], pagination: {} }), { status: 200 })
    }) as typeof fetch

    await searchScholarXiv({ query: 'generative AI in higher education' })
    assert.ok(capturedBody?.searchFilterString)
    assert.equal(capturedBody.searchFilterString.all, 'generative AI in higher education')
  })

  // 3. Topic search sends relevance sorting
  it('3. Topic search sends relevance sorting', async () => {
    let capturedBody: any = null
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string)
      return new Response(JSON.stringify({ data: [], pagination: {} }), { status: 200 })
    }) as typeof fetch

    await searchScholarXiv({ query: 'quantum computing' })
    assert.equal(capturedBody?.sortBy, 'relevance')
    assert.equal(capturedBody?.sortOrder, 'descending')
  })

  // 4. Topic search respects requested limit
  it('4. Topic search respects requested limit', async () => {
    let capturedBody: any = null
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string)
      return new Response(JSON.stringify({ data: [], pagination: {} }), { status: 200 })
    }) as typeof fetch

    await searchScholarXiv({ query: 'deep learning', limit: 12 })
    assert.equal(capturedBody?.limit, 12)
  })

  // 5. Exact paper lookup sends POST
  it('5. Exact paper lookup sends POST', async () => {
    let capturedMethod = ''
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedMethod = init?.method || ''
      return new Response(JSON.stringify({ data: [], pagination: {} }), { status: 200 })
    }) as typeof fetch

    await getScholarXivPaper('2401.01234')
    assert.equal(capturedMethod, 'POST')
  })

  // 6. Exact paper lookup uses searchFilterString.id
  it('6. Exact paper lookup uses searchFilterString.id', async () => {
    let capturedBody: any = null
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string)
      return new Response(JSON.stringify({ data: [], pagination: {} }), { status: 200 })
    }) as typeof fetch

    await getScholarXivPaper('2401.01234')
    assert.ok(capturedBody?.searchFilterString)
    assert.equal(capturedBody.searchFilterString.id, '2401.01234')
    assert.equal(capturedBody.limit, 1)
  })

  // 7. extractPaperId() handles ScholarXiv /abs/
  it('7. extractPaperId() handles ScholarXiv /abs/', () => {
    const id = extractPaperId('https://www.scholarxiv.com/abs/2401.01234')
    assert.equal(id, '2401.01234')
  })

  // 8. extractPaperId() handles ScholarXiv /pdf/
  it('8. extractPaperId() handles ScholarXiv /pdf/', () => {
    const id = extractPaperId('https://www.scholarxiv.com/pdf/2401.01234')
    assert.equal(id, '2401.01234')
  })

  // 9. extractPaperId() handles arXiv /abs/
  it('9. extractPaperId() handles arXiv /abs/', () => {
    const id = extractPaperId('https://arxiv.org/abs/2401.01234')
    assert.equal(id, '2401.01234')
  })

  // 10. extractPaperId() handles arXiv /pdf/
  it('10. extractPaperId() handles arXiv /pdf/', () => {
    const id = extractPaperId('https://arxiv.org/pdf/2401.01234')
    assert.equal(id, '2401.01234')
  })

  // 11. extractPaperId() handles bare IDs
  it('11. extractPaperId() handles bare IDs', () => {
    const id = extractPaperId('2401.01234')
    assert.equal(id, '2401.01234')
  })

  // 12. extractPaperId() handles versioned IDs
  it('12. extractPaperId() handles versioned IDs', () => {
    const id = extractPaperId('2401.01234v2')
    assert.equal(id, '2401.01234v2')
  })

  // 13. extractPaperId() returns null for unsupported input
  it('13. extractPaperId() returns null for unsupported input', () => {
    assert.equal(extractPaperId(''), null)
    assert.equal(extractPaperId('I want to study education'), null)
    assert.equal(extractPaperId('https://example.com/paper/123'), null)
  })

  // 14. API response is normalized correctly
  it('14. API response is normalized correctly into ResearchSource shape', async () => {
    const mockPaper = {
      id: 'https://arxiv.org/abs/2401.01234v1',
      extractedID: '2401.01234v1',
      title: 'Attention Is All You Need',
      summary: 'Transformer architecture introduced.',
      authors: ['Ashish Vaswani', 'Noam Shazeer'],
      published: '2017-06-12T00:00:00Z',
      pdfLink: 'https://arxiv.org/pdf/2401.01234v1',
      absLink: 'https://arxiv.org/abs/2401.01234v1',
    }

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ data: [mockPaper], pagination: { page: 0, limit: 1, hasMore: false, nextPage: null } }), { status: 200 })
    }) as typeof fetch

    const results = await searchScholarXiv({ query: 'transformer' })
    assert.equal(results.length, 1)
    const source = results[0]
    assert.equal(source.id, '2401.01234v1')
    assert.equal(source.title, 'Attention Is All You Need')
    assert.deepEqual(source.authors, ['Ashish Vaswani', 'Noam Shazeer'])
    assert.equal(source.summary, 'Transformer architecture introduced.')
    assert.equal(source.url, 'https://arxiv.org/abs/2401.01234v1')
    assert.equal(source.source, 'ScholarXiv')
    assert.equal(source.year, '2017')
  })

  // 15. 429 does not crash the application
  it('15. 429 does not crash the application and returns empty list / null', async () => {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Retry-After': '60' },
      })
    }) as typeof fetch

    const searchResults = await searchScholarXiv({ query: 'over query limit' })
    assert.deepEqual(searchResults, [])

    const singleResult = await getScholarXivPaper('2401.01234')
    assert.equal(singleResult, null)
  })

  // 16. Network failure does not crash the application
  it('16. Network failure does not crash the application and handles gracefully', async () => {
    globalThis.fetch = (async () => {
      throw new Error('UND_ERR_CONNECT_TIMEOUT: Connect timeout')
    }) as typeof fetch

    const searchResults = await searchScholarXiv({ query: 'network outage' })
    assert.deepEqual(searchResults, [])

    const singleResult = await getScholarXivPaper('2401.01234')
    assert.equal(singleResult, null)
  })

  // 17. Missing API key behaves safely
  it('17. Missing API key behaves safely without throwing', async () => {
    process.env.SCHOLARXIV_API_KEY = ''

    let fetchCalled = false
    globalThis.fetch = (async () => {
      fetchCalled = true
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    const searchResults = await searchScholarXiv({ query: 'test query' })
    assert.deepEqual(searchResults, [])
    assert.equal(fetchCalled, false)

    const paper = await getScholarXivPaper('2401.01234')
    assert.equal(paper, null)
    assert.equal(fetchCalled, false)
  })

  // 18. Empty results are handled correctly
  it('18. Empty results are handled correctly', async () => {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ data: [], pagination: { page: 0, limit: 10, hasMore: false, nextPage: null } }), { status: 200 })
    }) as typeof fetch

    const searchResults = await searchScholarXiv({ query: 'nonexistent paper 99999' })
    assert.deepEqual(searchResults, [])

    const singleResult = await getScholarXivPaper('9999.99999')
    assert.equal(singleResult, null)
  })
})

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { extractRoastTopicQuery, prepareRoastContext, getRoastPromptEnrichment } from '@/lib/ai/roast'
import { extractPaperId } from '@/lib/scholarxiv'
import { completeChat, type ChatTurn } from '@/lib/ai/complete'
import type { ResearchSource } from '@/lib/types'

describe('Roast Mode ScholarXiv Integration Tests', () => {
  const originalFetch = globalThis.fetch
  const originalAiKey = process.env.AI_API_KEY
  const originalAiBase = process.env.AI_BASE_URL
  const originalSxKey = process.env.SCHOLARXIV_API_KEY
  const originalSxBase = process.env.SCHOLARXIV_BASE_URL

  beforeEach(() => {
    process.env.AI_API_KEY = 'gsk_mock_test_key_12345'
    process.env.AI_BASE_URL = 'https://api.groq.com/openai/v1'
    process.env.SCHOLARXIV_API_KEY = 'sxv_mock_test_key_12345'
    process.env.SCHOLARXIV_BASE_URL = 'https://www.scholarxiv.com'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    process.env.AI_API_KEY = originalAiKey
    process.env.AI_BASE_URL = originalAiBase
    process.env.SCHOLARXIV_API_KEY = originalSxKey
    process.env.SCHOLARXIV_BASE_URL = originalSxBase
  })

  const mockPapers = [
    {
      id: '1706.03762',
      extractedID: '1706.03762',
      title: 'Attention Is All You Need',
      authors: ['Ashish Vaswani', 'Noam Shazeer'],
      published: '2017-06-12T00:00:00Z',
      absLink: 'https://scholarxiv.com/abs/1706.03762',
      pdfLink: 'https://scholarxiv.com/pdf/1706.03762',
      summary: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...',
    },
    {
      id: '1810.04805',
      extractedID: '1810.04805',
      title: 'BERT: Pre-training of Deep Bidirectional Transformers',
      authors: ['Jacob Devlin', 'Ming-Wei Chang'],
      published: '2018-10-11T00:00:00Z',
      absLink: 'https://scholarxiv.com/abs/1810.04805',
      pdfLink: 'https://scholarxiv.com/pdf/1810.04805',
      summary: 'We introduce a new language representation model called BERT...',
    },
  ]

  // TEST 1 — Topic input searches ScholarXiv
  it('TEST 1: Topic input searches ScholarXiv', async () => {
    let scholarXivCalled = false
    let searchBody: any = null

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv.com/api/v1/papers/search')) {
        scholarXivCalled = true
        if (init?.body) searchBody = JSON.parse(init.body as string)
        return new Response(JSON.stringify({ data: mockPapers }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ content: 'Roast content', researchDirections: [], sources: [] }) } }],
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const context = await prepareRoastContext([], 'I want to research whether AI tutors improve algebra retention')
    assert.equal(scholarXivCalled, true)
    assert.equal(context.inputType, 'topic')
    assert.ok(context.query?.includes('AI tutors improve algebra retention'))
    assert.equal(searchBody?.limit, 5)
    assert.deepEqual(searchBody?.searchFilterString, {
      all: context.query,
    })
  })

  // TEST 2 — Topic results become sources
  it('TEST 2: Topic results become sources returned in completion', async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv.com/api/v1/papers/search')) {
        return new Response(JSON.stringify({ data: mockPapers }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  content: '🔥 The Roast: Your idea is as fresh as stale bread.\n\n🧠 What the Research Says: Vaswani et al. already showed transformer basics.',
                  researchDirections: [{ title: 'Direction 1', description: 'Desc 1', researchQuestion: 'RQ 1' }],
                  sources: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const result = await completeChat('roast', [], 'Roast my idea: AI chatbots in middle school math classrooms')
    assert.equal(result.sources.length, 2)
    assert.equal(result.sources[0].title, 'Attention Is All You Need')
    assert.equal(result.sources[1].title, 'BERT: Pre-training of Deep Bidirectional Transformers')
    assert.ok(result.content.includes('The Roast'))
  })

  // TEST 3 — ScholarXiv paper URL is detected (/abs/)
  it('TEST 3: ScholarXiv paper URL is detected (/abs/)', () => {
    const url1 = 'https://scholarxiv.com/abs/2401.01234'
    const id1 = extractPaperId(url1)
    assert.equal(id1, '2401.01234')

    const url2 = 'Check this out: https://www.scholarxiv.com/abs/2305.18290v1'
    const id2 = extractPaperId(url2)
    assert.equal(id2, '2305.18290v1')
  })

  // TEST 4 — arXiv paper URL is detected
  it('TEST 4: arXiv paper URL is detected', () => {
    const url1 = 'https://arxiv.org/abs/2401.01234'
    const id1 = extractPaperId(url1)
    assert.equal(id1, '2401.01234')

    const url2 = 'Roast this paper: https://arxiv.org/pdf/2103.00020.pdf'
    const id2 = extractPaperId(url2)
    assert.equal(id2, '2103.00020')
  })

  // TEST 5 — Bare ID is detected (2401.01234)
  it('TEST 5: Bare ID is detected (2401.01234)', () => {
    const id1 = extractPaperId('2401.01234')
    assert.equal(id1, '2401.01234')

    const id2 = extractPaperId('Please roast 2301.07041v2')
    assert.equal(id2, '2301.07041v2')
  })

  // TEST 6 — Exact lookup uses searchFilterString.id (not all)
  it('TEST 6: Exact lookup uses searchFilterString.id (not all)', async () => {
    let capturedBody: any = null

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv.com/api/v1/papers/search')) {
        if (init?.body) capturedBody = JSON.parse(init.body as string)
        return new Response(JSON.stringify({ data: [mockPapers[0]] }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ content: 'Roasting paper...', researchDirections: [], sources: [] }) } }],
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const context = await prepareRoastContext([], 'https://scholarxiv.com/abs/2401.01234')
    assert.equal(context.inputType, 'paper')
    assert.equal(context.paperId, '2401.01234')
    assert.ok(capturedBody)
    assert.deepEqual(capturedBody?.searchFilterString, { id: '2401.01234' })
    assert.equal((capturedBody?.searchFilterString as { all?: string })?.all, undefined, 'Must NOT use "all" filter')
    assert.equal(capturedBody?.limit, 1)
  })

  // TEST 7 — Paper lookup returns exact source in sources
  it('TEST 7: Paper lookup returns exact source in sources', async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv.com/api/v1/papers/search')) {
        return new Response(JSON.stringify({ data: [mockPapers[0]] }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  content: '🔥 The Roast: [Attention Is All You Need](https://scholarxiv.com/abs/1706.03762) solved recurrence but created GPU energy crises.',
                  researchDirections: [],
                  sources: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const result = await completeChat('roast', [], '2401.01234')
    assert.equal(result.sources.length, 1)
    assert.equal(result.sources[0].title, 'Attention Is All You Need')
    assert.equal(result.sources[0].url, 'https://scholarxiv.com/abs/1706.03762')
    assert.ok(result.content.includes('Attention Is All You Need'))
  })

  // TEST 8 — No ScholarXiv results returns sources: [] without fabrication
  it('TEST 8: No ScholarXiv results returns sources: [] without fabrication', async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv.com/api/v1/papers/search')) {
        return new Response(JSON.stringify({ data: [] }), { status: 200 })
      }
      // AI tries to hallucinate a source
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  content: '🔥 The Roast: This idea is unstudied in ScholarXiv.',
                  researchDirections: [],
                  sources: [{ title: 'Hallucinated Fake Paper', url: 'https://fake.edu', authors: ['Ghost'] }],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const result = await completeChat('roast', [], 'quantum underwater basket weaving with AI')
    assert.deepEqual(result.sources, [], 'Must strictly discard LLM hallucinated sources when ScholarXiv returns 0')
    assert.ok(result.content.includes('Roast'))
  })

  // TEST 9 — ScholarXiv failure handles gracefully without crash (sources: [])
  it('TEST 9: ScholarXiv failure handles gracefully without crash (sources: [])', async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv.com')) {
        return new Response('ScholarXiv 503 Service Unavailable', { status: 503 })
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  content: '🔥 The Roast: Service is down but your idea still has holes.',
                  researchDirections: [],
                  sources: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const result = await completeChat('roast', [], 'machine learning for microplastics')
    assert.deepEqual(result.sources, [])
    assert.ok(result.content.includes('Roast'))
  })

  // TEST 10 — Vent isolation (Vent still uses assessVentReadiness and is not impacted)
  it('TEST 10: Vent isolation (Vent still uses assessVentReadiness and is not impacted)', async () => {
    let scholarXivCalled = false

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv')) {
        scholarXivCalled = true
        return new Response(JSON.stringify({ data: [] }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  content: 'Narrow your idea.',
                  researchDirections: [],
                  sources: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      )
    }) as typeof fetch

    // Vague idea in Vent mode should NOT trigger ScholarXiv search
    const ventResult = await completeChat('vent', [], 'I want to study machine learning.')
    assert.equal(scholarXivCalled, false, 'Vent mode should still narrow vague idea and not call ScholarXiv')
    assert.deepEqual(ventResult.sources, [])
  })

  // TEST 11 — Funding isolation (Funding does not execute Roast ScholarXiv logic)
  it('TEST 11: Funding isolation (Funding does not execute Roast ScholarXiv logic)', async () => {
    let scholarXivCalled = false

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv')) {
        scholarXivCalled = true
        return new Response(JSON.stringify({ data: [] }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  content: 'Here are potential funding sources for your proposal.',
                  researchDirections: [],
                  sources: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const fundingResult = await completeChat('funding', [], 'AI education grant')
    assert.equal(scholarXivCalled, false, 'Funding mode must not execute Roast search logic')
    assert.deepEqual(fundingResult.sources, [])
  })

  // TEST 12 — Existing API contract preserved
  it('TEST 12: Existing API contract preserved (content, sources, researchDirections)', async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv')) {
        return new Response(JSON.stringify({ data: mockPapers }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  content: '🔥 The Roast\n\nMethodology is shaky.',
                  researchDirections: [
                    {
                      title: 'Direction 1',
                      description: 'Desc 1',
                      researchQuestion: 'RQ 1',
                    },
                  ],
                  sources: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const result = await completeChat('roast', [], 'AI tutoring')
    assert.equal(typeof result.content, 'string')
    assert.ok(Array.isArray(result.sources))
    assert.ok(Array.isArray(result.researchDirections))
    assert.equal(result.sources.length, 2)
    assert.equal(result.researchDirections.length, 1)
    assert.equal(result.researchDirections[0].title, 'Direction 1')
  })

  // EXTRA TEST: Conversational continuation in Roast
  it('TEST 13 (Conversational Continuation): Multi-turn conversational feedback does not re-search ScholarXiv', async () => {
    let scholarXivCalled = false

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv')) {
        scholarXivCalled = true
        return new Response(JSON.stringify({ data: mockPapers }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  content: 'Glad you agree! Here is more constructive feedback.',
                  researchDirections: [],
                  sources: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const history: ChatTurn[] = [
      { role: 'user', content: 'Roast my idea: AI in schools' },
      { role: 'assistant', content: '🔥 The Roast: Too broad.' },
    ]

    const result = await completeChat('roast', history, 'That sounds good, tell me more')
    assert.equal(scholarXivCalled, false, 'Conversational continuation must not trigger ScholarXiv search')
    assert.deepEqual(result.sources, [])
  })

  // EXTRA TEST: extractRoastTopicQuery cleans prefix accurately
  it('TEST 14 (Topic query cleaning): Cleans common prefixes properly', () => {
    assert.equal(
      extractRoastTopicQuery('Roast my research idea: using LLMs for code synthesis in high schools'),
      'using LLMs for code synthesis in high schools'
    )
    assert.equal(
      extractRoastTopicQuery('Can you roast this topic: multimodal vision models for radiology'),
      'multimodal vision models for radiology'
    )
    assert.equal(
      extractRoastTopicQuery('"reinforcement learning for robotic manipulation"'),
      'reinforcement learning for robotic manipulation'
    )
    // Empty / meta requests without a topic return null
    assert.equal(extractRoastTopicQuery('roast my research idea'), null)
    assert.equal(extractRoastTopicQuery('my research idea'), null)
    assert.equal(extractRoastTopicQuery('roast me'), null)
    assert.equal(extractRoastTopicQuery('can you roast this'), null)
    assert.equal(extractRoastTopicQuery('please roast'), null)
  })

  // TEST 15 — Empty/meta roast prompts do not search ScholarXiv and prompt user for topic
  it('TEST 15: Empty/meta roast prompts do not search ScholarXiv and prompt user for topic', async () => {
    let scholarXivCalled = false

    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv')) {
        scholarXivCalled = true
        return new Response(JSON.stringify({ data: mockPapers }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  content: "Roast WHAT exactly? 😭 Bestie, you didn't give me a research idea or paper!",
                  researchDirections: [],
                  sources: [],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const context = await prepareRoastContext([], 'roast my research idea')
    assert.equal(scholarXivCalled, false, 'ScholarXiv should NOT be called for empty topic')
    assert.equal(context.isEmptyTopic, true)
    assert.deepEqual(context.sources, [])

    const result = await completeChat('roast', [], 'roast my research idea')
    assert.equal(scholarXivCalled, false)
    assert.deepEqual(result.sources, [])
    assert.ok(result.content.includes("didn't give me a research idea"))
  })
})

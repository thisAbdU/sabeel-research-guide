import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { assessVentReadiness, findLastVentQuery } from '@/lib/ai/vent'
import { completeChat, type ChatTurn } from '@/lib/ai/complete'
import type { ResearchSource } from '@/lib/types'

describe('Vent Mode Decision & Integration Tests', () => {
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

  // TEST 1 — Very broad idea
  it('TEST 1: Very broad idea ("I want to research AI.") asks narrowing questions, does not search ScholarXiv, sources are empty', async () => {
    const decision = assessVentReadiness([], 'I want to research AI.')
    assert.equal(decision.shouldSearch, false)
    assert.equal(decision.state, 'broad')
    assert.equal(decision.query, null)
    assert.ok(decision.missingDimensions && decision.missingDimensions.length > 0)

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
                  content: 'AI is a very broad field. What specific application or educational setting are you considering?',
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

    const result = await completeChat('vent', [], 'I want to research AI.')
    assert.equal(scholarXivCalled, false, 'ScholarXiv should not be called for very broad idea')
    assert.deepEqual(result.sources, [], 'Sources must be empty')
    assert.ok(result.content.includes('broad'))
  })

  // TEST 2 — Broad education idea
  it('TEST 2: Broad education idea ("I\'m interested in AI and education.") does not immediately search ScholarXiv', async () => {
    const decision = assessVentReadiness([], "I'm interested in AI and education.")
    assert.equal(decision.shouldSearch, false)
    assert.equal(decision.state, 'broad')
    assert.equal(decision.query, null)
  })

  // TEST 3 — Sufficiently focused idea
  it('TEST 3: Sufficiently focused idea triggers ScholarXiv search with focused query and returns sources', async () => {
    const history: ChatTurn[] = [
      { role: 'user', content: "I'm interested in AI and education." },
      { role: 'assistant', content: 'What level of education and student population are you looking at?' },
      { role: 'user', content: 'I want to understand how AI tools affect university students.' },
      { role: 'assistant', content: 'What specific outcome would you like to evaluate?' },
    ]
    const currentMessage = 'Maybe learning outcomes, specifically among Ethiopian university students.'

    const decision = assessVentReadiness(history, currentMessage)
    assert.equal(decision.shouldSearch, true)
    assert.equal(decision.state, 'focused')
    assert.ok(decision.query)
    assert.ok(decision.query.includes('learning outcomes'))
    assert.ok(decision.query.includes('university students'))

    const mockPapers = [
      {
        id: '2401.0001',
        extractedID: '2401.0001',
        title: 'Evaluating Generative AI Tools on Student Learning Outcomes in Higher Education',
        authors: ['Abebe Kebede'],
        summary: 'A study on university student performance using AI.',
        absLink: 'https://www.scholarxiv.com/abs/2401.0001',
        published: '2024-01-01T00:00:00Z',
      },
    ]

    let searchSentQuery = ''
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv.com')) {
        const body = JSON.parse(init?.body as string)
        searchSentQuery = body.searchFilterString?.all
        return new Response(JSON.stringify({ data: mockPapers }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  content:
                    'Your idea is now focused. Here is a paper: [Evaluating Generative AI Tools on Student Learning Outcomes in Higher Education](https://www.scholarxiv.com/abs/2401.0001). Why it is relevant: It investigates university student outcomes.',
                  researchDirections: [
                    {
                      title: 'Generative AI and Student Grades in Ethiopian Universities',
                      description: 'Examine semester GPA differences.',
                      researchQuestion: 'How does AI tool adoption correlate with first-year student outcomes?',
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

    const result = await completeChat('vent', history, currentMessage)
    assert.ok(searchSentQuery.length > 0)
    assert.equal(result.sources.length, 1)
    assert.equal(result.sources[0].title, 'Evaluating Generative AI Tools on Student Learning Outcomes in Higher Education')
    assert.equal(result.sources[0].url, 'https://www.scholarxiv.com/abs/2401.0001')
  })

  // TEST 4 — Paper relevance and prompt instructions
  it('TEST 4: Injects ScholarXiv literature into prompt with instructions to explain relevance and clickable markdown links', async () => {
    let capturedSystemPrompt = ''
    const mockPapers = [
      {
        id: '2402.1234',
        extractedID: '2402.1234',
        title: 'Impact of AI on Critical Thinking',
        authors: ['Jane Doe'],
        summary: 'Measures student critical thinking changes.',
        absLink: 'https://www.scholarxiv.com/abs/2402.1234',
        published: '2024-02-01T00:00:00Z',
      },
    ]

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv.com')) {
        return new Response(JSON.stringify({ data: mockPapers }), { status: 200 })
      }
      if (urlStr.includes('groq.com')) {
        const body = JSON.parse(init?.body as string)
        capturedSystemPrompt = body.messages.find((m: any) => m.role === 'system')?.content || ''
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    content: 'Relevant research found.',
                    researchDirections: [],
                    sources: [],
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        )
      }
      return new Response('Not found', { status: 404 })
    }) as typeof fetch

    await completeChat(
      'vent',
      [],
      'How generative AI affects learning outcomes among Ethiopian university students.'
    )

    assert.ok(capturedSystemPrompt.includes('RESEARCH SOURCES FROM SCHOLARXIV:'))
    assert.ok(capturedSystemPrompt.includes('Impact of AI on Critical Thinking'))
    assert.ok(capturedSystemPrompt.includes('explain briefly and specifically WHY it is relevant'))
    assert.ok(capturedSystemPrompt.includes('clickable markdown link using its exact URL'))
    assert.ok(capturedSystemPrompt.includes('NEVER claim "there is a research gap"'))
  })

  // TEST 5 — Continued refinement
  it('TEST 5: Continued refinement ("Actually, let\'s focus specifically on ChatGPT.") triggers new ScholarXiv search with updated query', async () => {
    const history: ChatTurn[] = [
      { role: 'user', content: 'How generative AI affects learning outcomes among Ethiopian university students.' },
      { role: 'assistant', content: 'Here are papers on generative AI...' },
    ]
    const lastQuery = 'generative AI learning outcomes university students Ethiopian'
    const refinementMessage = "Actually, let's focus specifically on ChatGPT."

    const decision = assessVentReadiness(history, refinementMessage, lastQuery)
    assert.equal(decision.shouldSearch, true)
    assert.equal(decision.state, 'refinement')
    assert.ok(decision.query)
    assert.ok(decision.query.includes('ChatGPT'))
    assert.notEqual(decision.query, lastQuery)
  })

  // TEST 6 — Minor conversational continuation
  it('TEST 6: Minor conversational continuation ("That sounds interesting.") does NOT trigger unnecessary duplicate search', async () => {
    const history: ChatTurn[] = [
      { role: 'user', content: 'How generative AI affects learning outcomes among Ethiopian university students.' },
      { role: 'assistant', content: 'Here are papers on generative AI...' },
    ]
    const lastQuery = 'generative AI learning outcomes university students Ethiopian'

    const decision1 = assessVentReadiness(history, 'That sounds interesting.', lastQuery)
    assert.equal(decision1.shouldSearch, false)
    assert.equal(decision1.state, 'conversational')

    const decision2 = assessVentReadiness(history, 'That sounds good.', lastQuery)
    assert.equal(decision2.shouldSearch, false)
    assert.equal(decision2.state, 'conversational')
  })

  // TEST 7 — No ScholarXiv results
  it('TEST 7: No ScholarXiv results returns empty sources and does not fabricate papers', async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv.com')) {
        return new Response(JSON.stringify({ data: [], pagination: { total: 0 } }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  content: "I didn't find direct matching papers, but we can refine your direction.",
                  researchDirections: [],
                  // Model attempted to hallucinate a source:
                  sources: [{ title: 'Hallucinated Paper', url: 'https://fake.url' }],
                }),
              },
            },
          ],
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const result = await completeChat(
      'vent',
      [],
      'How generative AI affects learning outcomes among Ethiopian university students.'
    )
    assert.deepEqual(result.sources, [], 'Must strictly discard hallucinated sources when ScholarXiv returns 0')
  })

  // TEST 8 — ScholarXiv failure resilience
  it('TEST 8: ScholarXiv failure does not crash Vent, returns conversational response with empty sources', async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv.com')) {
        throw new Error('Connect Timeout Error: scholarxiv.com:443')
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  content: "The literature service is temporarily unavailable, but let's continue developing your question.",
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

    const result = await completeChat(
      'vent',
      [],
      'How generative AI affects learning outcomes among Ethiopian university students.'
    )
    assert.ok(result.content.includes('literature service'))
    assert.deepEqual(result.sources, [])
  })

  // TEST 9 — Existing conversation context preservation
  it('TEST 9: findLastVentQuery correctly reconstructs past query across multi-turn history', () => {
    const history: ChatTurn[] = [
      { role: 'user', content: "I'm interested in AI and education." },
      { role: 'assistant', content: 'What setting or population?' },
      { role: 'user', content: 'I want to understand how AI tools affect university students.' },
      { role: 'assistant', content: 'What outcome?' },
      { role: 'user', content: 'Maybe learning outcomes, specifically among Ethiopian university students.' },
      { role: 'assistant', content: 'Here are papers...' },
    ]

    const pastQuery = findLastVentQuery(history)
    assert.ok(pastQuery)
    assert.ok(pastQuery.includes('learning outcomes'))

    // Now test sending a refinement on top of this history
    const refinement = assessVentReadiness(history, "Actually, let's focus specifically on ChatGPT.", pastQuery)
    assert.equal(refinement.shouldSearch, true)
    assert.equal(refinement.state, 'refinement')
    assert.ok(refinement.query?.includes('ChatGPT'))
  })

  // TEST 10 — Mode isolation (Funding remains untouched by ScholarXiv logic; Vent logic is isolated)
  it('TEST 10: Mode isolation - Funding mode does not execute ScholarXiv search logic, and Vent logic is isolated', async () => {
    let scholarXivCalled = false
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('scholarxiv.com')) {
        scholarXivCalled = true
        return new Response(JSON.stringify({ data: [] }), { status: 200 })
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  content: 'Mode response content',
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

    await completeChat('funding', [], 'AI in education')
    assert.equal(scholarXivCalled, false, 'Funding should not execute ScholarXiv search')

    await completeChat('vent', [], 'AI in education')
    assert.equal(scholarXivCalled, false, 'Vent mode should narrow broad topic before searching ScholarXiv')
  })
})

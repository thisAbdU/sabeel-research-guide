import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { detectLanguage, translateText } from '@/lib/translate'

process.env.ADDIS_API_KEY = process.env.ADDIS_API_KEY || 'test_addis_key'

describe('Language Detection & Translation Tests', () => {
  it('detects English text correctly', () => {
    assert.equal(detectLanguage('Can you help me find research topics about AI in education?'), 'en')
    assert.equal(detectLanguage('Roast my research paper on neural networks.'), 'en')
    assert.equal(detectLanguage(''), 'en')
  })

  it('detects Amharic text via Ethiopic Unicode script', () => {
    assert.equal(detectLanguage('ሰላም ስለ አርቲፊሻል ኢንተለጀንስ ማጥናት እፈልጋለሁ'), 'am')
    assert.equal(detectLanguage('የምርምር ሃሳቤን ገምግምልኝ'), 'am')
    assert.equal(detectLanguage('እንደምን አደርክ?'), 'am')
  })

  it('detects Afan Oromo text via distinctive lexical markers', () => {
    assert.equal(detectLanguage('Akkam jirtu? Barumsa saayinsii kompiitaraa qorachuu barbaada'), 'om')
    assert.equal(detectLanguage('Waa\'ee qorannoo barnoota irratti na gargaari'), 'om')
    assert.equal(detectLanguage('Qorannoo barattoota biyya keenyaa'), 'om')
  })

  it('returns original text immediately if from === to', async () => {
    const text = 'Hello world'
    const result = await translateText({ text, from: 'en', to: 'en' })
    assert.equal(result, text)
  })

  it('protects ScholarXiv URLs from translation mangling', async () => {
    const originalFetch = globalThis.fetch
    try {
      let interceptedBody = ''
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        interceptedBody = typeof init?.body === 'string' ? init.body : ''
        return new Response(
          JSON.stringify({
            status: 'success',
            data: {
              translation: 'ይህ ወረቀት ነው: __SCHOLARXIV_URL_0__ እና __SCHOLARXIV_URL_1__',
            },
          }),
          { status: 200 }
        )
      }) as typeof fetch

      const sample = 'This paper is: https://scholarxiv.com/abs/2401.123 and https://scholarxiv.com/journal/sx.987'
      const translated = await translateText({ text: sample, from: 'en', to: 'am' })

      assert.ok(interceptedBody.includes('__SCHOLARXIV_URL_0__'))
      assert.ok(!interceptedBody.includes('https://scholarxiv.com/abs/2401.123'))
      assert.equal(translated, 'ይህ ወረቀት ነው: https://scholarxiv.com/abs/2401.123 እና https://scholarxiv.com/journal/sx.987')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('gracefully falls back to original text if Addis AI returns an error', async () => {
    const originalFetch = globalThis.fetch
    try {
      globalThis.fetch = (async () => {
        return new Response('Internal Server Error', { status: 500 })
      }) as typeof fetch

      const sample = 'Important research methodology'
      const result = await translateText({ text: sample, from: 'en', to: 'am' })
      assert.equal(result, sample)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

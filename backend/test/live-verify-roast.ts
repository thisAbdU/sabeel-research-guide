import fs from 'fs'
import path from 'path'

// Load .env.local BEFORE anything else
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of envContent.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim()
      const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      process.env[key] = val
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function runLiveVerification() {
  const { completeChat } = await import('../lib/ai/complete')

  async function chatWithRetry(mode: any, hist: any, msg: string, maxAttempts = 6) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await completeChat(mode, hist, msg)
      } catch (err: any) {
        if (err?.message?.includes('Rate limit reached') && attempt < maxAttempts) {
          console.log(`  (Rate limited by Groq, waiting 20s before attempt ${attempt + 1})...`)
          await sleep(20000)
          continue
        }
        throw err
      }
    }
    throw new Error('Exhausted retries')
  }

  console.log('=== STARTING LIVE ROAST SCHOLARXIV VERIFICATION ===\n')

  const history: { role: 'user' | 'assistant'; content: string }[] = []

  // SCENARIO A: Topic Roast
  console.log('--- SCENARIO A: TOPIC ROAST ---')
  const msg1 = 'Roast my research idea: Using ChatGPT for automated essay grading in high schools'
  console.log('User:', msg1)
  const res1 = await chatWithRetry('roast', history, msg1)
  console.log('ScholarXiv Sources returned:', res1.sources.length)
  if (res1.sources.length > 0) {
    console.log('First paper:', res1.sources[0].title, `(${res1.sources[0].url})`)
  }
  console.log('Research directions:', res1.researchDirections.length)
  console.log('Assistant content snippet:\n', res1.content.slice(0, 300), '...\n')

  history.push({ role: 'user', content: msg1 })
  history.push({ role: 'assistant', content: res1.content })

  await sleep(20000)

  // SCENARIO B: Conversational Continuation
  console.log('--- SCENARIO B: CONVERSATIONAL CONTINUATION ---')
  const msg2 = 'That sounds good, tell me more'
  console.log('User:', msg2)
  const res2 = await chatWithRetry('roast', history, msg2)
  console.log('ScholarXiv Sources returned (expect 0 for continuation):', res2.sources.length)
  console.log('Assistant content snippet:\n', res2.content.slice(0, 250), '...\n')

  history.push({ role: 'user', content: msg2 })
  history.push({ role: 'assistant', content: res2.content })

  await sleep(20000)

  // SCENARIO C: Paper Roast (Specific Paper ID / URL)
  console.log('--- SCENARIO C: SPECIFIC PAPER ROAST ---')
  const msg3 = 'Roast this paper: https://arxiv.org/abs/2401.01234'
  console.log('User:', msg3)
  const res3 = await chatWithRetry('roast', [], msg3)
  console.log('ScholarXiv Sources returned (expect exact paper):', res3.sources.length)
  if (res3.sources.length > 0) {
    console.log('Exact paper title:', res3.sources[0].title)
    console.log('Exact paper url:', res3.sources[0].url)
  }
  console.log('Assistant content snippet:\n', res3.content.slice(0, 300), '...\n')

  console.log('=== LIVE ROAST SCHOLARXIV VERIFICATION COMPLETE ===')
}

runLiveVerification().catch((err) => {
  console.error('Live verification error:', err)
  process.exit(1)
})

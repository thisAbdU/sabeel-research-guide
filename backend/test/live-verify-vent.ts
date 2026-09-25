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

  async function chatWithRetry(mode: any, hist: any, msg: string, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await completeChat(mode, hist, msg)
      } catch (err: any) {
        if (err?.message?.includes('Rate limit reached') && attempt < maxAttempts) {
          console.log(`  (Rate limited by Groq, waiting 15s before attempt ${attempt + 1})...`)
          await sleep(15000)
          continue
        }
        throw err
      }
    }
    throw new Error('Exhausted retries')
  }

  console.log('=== STARTING LIVE VENT VERIFICATION ===\n')

  const history: { role: 'user' | 'assistant'; content: string }[] = []

  // MESSAGE 1
  console.log('--- MESSAGE 1 ---')
  const msg1 = "I'm interested in AI and education."
  console.log('User:', msg1)
  const res1 = await chatWithRetry('vent', history, msg1)
  console.log('ScholarXiv Sources returned:', res1.sources.length)
  console.log('Research directions:', res1.researchDirections.length)
  console.log('Assistant content snippet:', res1.content.slice(0, 150), '...\n')
  history.push({ role: 'user', content: msg1 })
  history.push({ role: 'assistant', content: res1.content })

  await sleep(10000)

  // MESSAGE 2
  console.log('--- MESSAGE 2 ---')
  const msg2 = 'I want to understand how AI tools affect university students.'
  console.log('User:', msg2)
  const res2 = await chatWithRetry('vent', history, msg2)
  console.log('ScholarXiv Sources returned:', res2.sources.length)
  console.log('Research directions:', res2.researchDirections.length)
  console.log('Assistant content snippet:', res2.content.slice(0, 150), '...\n')
  history.push({ role: 'user', content: msg2 })
  history.push({ role: 'assistant', content: res2.content })

  await sleep(10000)

  // MESSAGE 3
  console.log('--- MESSAGE 3 ---')
  const msg3 = 'Maybe learning outcomes, specifically among Ethiopian university students.'
  console.log('User:', msg3)
  const res3 = await chatWithRetry('vent', history, msg3)
  console.log('ScholarXiv Sources returned:', res3.sources.length)
  if (res3.sources.length > 0) {
    res3.sources.forEach((s, idx) => console.log(`  [${idx + 1}] ${s.title} (${s.url})`))
  }
  console.log('Research directions:', res3.researchDirections.length)
  console.log('Assistant content snippet:', res3.content.slice(0, 200), '...\n')
  history.push({ role: 'user', content: msg3 })
  history.push({ role: 'assistant', content: res3.content })

  await sleep(15000)

  // MESSAGE 4 (Refinement)
  console.log('--- MESSAGE 4 (Refinement) ---')
  const msg4 = "Actually, let's focus specifically on ChatGPT."
  console.log('User:', msg4)
  const res4 = await chatWithRetry('vent', history, msg4)
  console.log('ScholarXiv Sources returned:', res4.sources.length)
  if (res4.sources.length > 0) {
    res4.sources.forEach((s, idx) => console.log(`  [${idx + 1}] ${s.title} (${s.url})`))
  }
  console.log('Research directions:', res4.researchDirections.length)
  console.log('Assistant content snippet:', res4.content.slice(0, 200), '...\n')
  history.push({ role: 'user', content: msg4 })
  history.push({ role: 'assistant', content: res4.content })

  await sleep(15000)

  // MESSAGE 5 (Conversational)
  console.log('--- MESSAGE 5 (Conversational) ---')
  const msg5 = 'That sounds good.'
  console.log('User:', msg5)
  const res5 = await chatWithRetry('vent', history, msg5)
  console.log('ScholarXiv Sources returned:', res5.sources.length)
  console.log('Research directions:', res5.researchDirections.length)
  console.log('Assistant content snippet:', res5.content.slice(0, 150), '...\n')

  console.log('=== LIVE VENT VERIFICATION COMPLETE: ALL 5 STEPS SUCCEEDED ===')
}

runLiveVerification().catch((err) => {
  console.error('Live verification failed:', err)
  process.exit(1)
})

import fs from 'node:fs'
import path from 'node:path'

// Safely load .env.local without external packages
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match && match[1] && match[2]) {
      process.env[match[1]] = match[2].trim()
    }
  }
}

import { searchScholarXiv, getScholarXivPaper } from '@/lib/scholarxiv'

async function main() {
  const hasKey = Boolean(process.env.SCHOLARXIV_API_KEY)
  if (!hasKey) {
    console.log('KEY_STATUS: UNAVAILABLE')
    return
  }
  console.log('KEY_STATUS: AVAILABLE')

  console.log('\n--- TEST A: Topic Search ("generative AI education") ---')
  const topicResults = await searchScholarXiv({ query: 'generative AI education', limit: 3 })
  console.log(`Topic Results Count: ${topicResults.length}`)
  if (topicResults.length > 0) {
    console.log('Sample Paper Title:', topicResults[0].title)
    console.log('Sample Paper URL:', topicResults[0].url)
    console.log('Sample Paper Source:', topicResults[0].source)
    console.log('Sample Paper Year:', topicResults[0].year)
    console.log('Sample Authors Count:', topicResults[0].authors.length)
  }

  console.log('\n--- TEST B: Exact Paper Lookup ("2401.01234") ---')
  const paperResult = await getScholarXivPaper('2401.01234')
  if (paperResult) {
    console.log('Exact Lookup Result: Found')
    console.log('ID:', paperResult.id)
    console.log('Title:', paperResult.title)
    console.log('URL:', paperResult.url)
  } else {
    console.log('Exact Lookup Result: Zero matches (legitimate response for this ID)')
  }
}

main().catch((err) => {
  console.error('Manual verification error:', err.message)
})

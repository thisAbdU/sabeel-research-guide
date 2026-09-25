import { extractPaperId, getScholarXivPaper, searchScholarXiv } from '@/lib/scholarxiv'
import type { ChatTurn } from '@/lib/ai/complete'
import type { ResearchSource } from '@/lib/types'

export type RoastInputType = 'paper' | 'topic'

export type RoastContext = {
  inputType: RoastInputType
  paperId?: string
  query?: string
  sources: ResearchSource[]
  isConversational?: boolean
  isEmptyTopic?: boolean
}

const CONVERSATIONAL_REGEX =
  /^(that('s| is)? (sounds?|looks?|seems?) (good|great|interesting|helpful|cool|awesome|fine|nice)|sounds (good|great|interesting|nice)|okay|ok|cool|great|thanks|thank you|got it|makes sense|i see|let's continue|what do you think|can you explain more|tell me more|yes|yep|sure|perfect)([,;\s]+(tell me more|can you explain more|what do you think|let's continue|thanks|thank you|please continue|go on))?[\s.!,]*$/i

export function extractRoastTopicQuery(text: string): string | null {
  let cleaned = text.trim()

  cleaned = cleaned.replace(
    /^(?:can\s+you\s+)?(?:please\s+)?roast\s+(?:this|my)?\s*(?:research\s+)?(?:idea|topic|paper|proposal|question|concept|project)?[:\s-]*/i,
    ''
  )
  cleaned = cleaned.replace(/^please\s+roast[:\s-]*/i, '')
  cleaned = cleaned.replace(
    /^i\s+(?:want\s+to|would\s+like\s+to)\s+(?:research|study|explore|investigate)[:\s-]*/i,
    ''
  )
  cleaned = cleaned.replace(
    /^(?:my\s+)?(?:research\s+)?(?:idea|topic|paper|proposal|question|concept|project)[:\s-]*/i,
    ''
  )

  cleaned = cleaned.replace(/^["'“](.*)["'”]$/, '$1').trim()

  // If nothing substantive is left, or user only gave meta-words like "my research idea", return null
  if (
    !cleaned ||
    cleaned.length < 3 ||
    /^(?:it|this|that|me|something|anything|idea|topic|paper|research\s+idea)$/i.test(cleaned)
  ) {
    return null
  }

  return cleaned
}

export function findPreviousRoastTopic(history: ChatTurn[]): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i]
    if (turn.role === 'user') {
      const q = extractRoastTopicQuery(turn.content)
      if (q) return q
    }
  }
  return null
}

export async function prepareRoastContext(
  history: ChatTurn[],
  message: string
): Promise<RoastContext> {
  const trimmed = message.trim()

  // 1. Check for specific paper ID or URL
  const paperId = extractPaperId(trimmed)
  if (paperId) {
    try {
      const paper = await getScholarXivPaper(paperId)
      return {
        inputType: 'paper',
        paperId,
        sources: paper ? [paper] : [],
      }
    } catch (err) {
      console.warn('ScholarXiv paper lookup error in Roast mode:', err)
      return {
        inputType: 'paper',
        paperId,
        sources: [],
      }
    }
  }

  // 2. Check for conversational continuation
  if (history.length > 0 && CONVERSATIONAL_REGEX.test(trimmed)) {
    return {
      inputType: 'topic',
      isConversational: true,
      sources: [],
    }
  }

  // 3. Topic search
  let query = extractRoastTopicQuery(trimmed)

  // If the user's message is empty of topic (e.g. "roast my research idea"),
  // check if they already provided a topic earlier in the conversation
  if (!query && history.length > 0) {
    query = findPreviousRoastTopic(history)
  }

  // If still no substantive topic exists, flag as empty topic
  if (!query) {
    return {
      inputType: 'topic',
      isEmptyTopic: true,
      sources: [],
    }
  }

  try {
    const sources = await searchScholarXiv({ query, limit: 5 })
    return {
      inputType: 'topic',
      query,
      sources,
    }
  } catch (err) {
    console.warn('ScholarXiv topic search error in Roast mode:', err)
    return {
      inputType: 'topic',
      query,
      sources: [],
    }
  }
}

export function getRoastPromptEnrichment(context: RoastContext): string {
  if (context.isEmptyTopic) {
    return `\n\nROAST TARGET: MISSING RESEARCH TOPIC OR PAPER
The user requested a roast, but did NOT provide an actual research topic, question, idea, or paper (e.g. they only said "roast my research idea", "my research idea", "roast me", or something similarly empty).
- Do NOT make up, invent, or hallucinate a research topic!
- Do NOT recommend research directions, papers, or topics. You cannot recommend research for a topic that does not exist!
- In your witty, playful Roast persona, playfully call them out for not giving you anything to roast (e.g., "Roast WHAT exactly? 😭 Bestie, you didn't give me a research idea or paper!", "I'm ready to throw hands with your methodology, but you have to actually drop an idea first!").
- Prompt them to share their research question, idea, hypothesis, or ScholarXiv/arXiv paper link or ID so you can critique it.
- In your JSON response, you MUST set "sources": [] and "researchDirections": [].`
  }

  if (context.isConversational) {
    return `\n\nROAST CONTEXT: CONVERSATIONAL CONTINUATION\nThe user is responding to your previous roast or asking for elaboration.\n- Respond conversationally while staying in your witty, constructive research persona.\n- Do NOT perform a new literature search.\n- Keep "sources": [].`
  }

  if (context.inputType === 'paper') {
    if (context.sources.length > 0) {
      const paper = context.sources[0]
      return `\n\nROAST TARGET: SPECIFIC RESEARCH PAPER
The user has submitted an academic paper to roast.

SCHOLARXIV RESEARCH CONTEXT:
1. Title: "${paper.title}"
   Authors: ${paper.authors.join(', ')}
   Year: ${paper.year || 'Unknown'}
   URL: ${paper.url}
   Summary: ${paper.summary || 'No summary available'}

CRITICAL INSTRUCTIONS FOR PAPER ROAST:
1. Roast the RESEARCH itself (methodology, scope, claims, assumptions, potential limitations). NEVER insult the authors or researcher personally.
2. Ground your critique in the retrieved paper details and summary above.
3. Clearly distinguish what the paper actually claims/demonstrates from your critique.
4. Do NOT pretend to know internal details, dataset specifics, or equations that are not present in the provided summary.
5. In your markdown content, refer to the paper as a clickable markdown link using its exact URL: [${paper.title}](${paper.url}).
6. Follow the required Roast structure (🔥 The Roast, 🚨 What's Actually Wrong, 🧠 What the Research Says, ✨ How We Fix It, 🎯 Better Research Questions).
7. In your JSON response, include this exact paper in the "sources" array.`
    }

    return `\n\nROAST TARGET: SPECIFIC RESEARCH PAPER (LOOKUP UNAVAILABLE)
The user provided a paper ID (${context.paperId}), but ScholarXiv could not find or retrieve this paper (it may not be indexed or service was temporarily unavailable).
- Do NOT fabricate or invent paper details, authors, or abstracts.
- Mention conversationally that the paper could not be retrieved from ScholarXiv right now, but critique the topic or title if mentioned.
- Keep "sources": [].`
  }

  // Topic Roast
  if (context.sources.length > 0) {
    const sourceContext = context.sources
      .map(
        (source, idx) =>
          `${idx + 1}. Title: "${source.title}"\n   Authors: ${source.authors.join(', ')}\n   URL: ${source.url}\n   Summary: ${source.summary || 'No summary available'}`
      )
      .join('\n\n')

    return `\n\nROAST TARGET: RESEARCH TOPIC / IDEA
The user wants you to roast their research topic: "${context.query}".

SCHOLARXIV RESEARCH CONTEXT:
${sourceContext}

CRITICAL INSTRUCTIONS FOR TOPIC ROAST:
1. Roast the RESEARCH IDEA, NOT the researcher personally. Keep it witty, humorous, Gen-Z friendly, but academically constructive.
2. Ground "🧠 What the Research Says" in the real ScholarXiv literature provided above.
3. Whenever citing or mentioning any of the provided papers, format its title as a clickable markdown link: [Paper Title](URL).
4. Point out what's actually wrong with the topic scope (too broad, population unclear, variables missing, already studied in literature).
5. Suggest 2-4 concrete, actionable ways to improve the idea and provide better candidate research questions in "researchDirections".
6. In your JSON response, include these exact sources in the "sources" array.
7. NEVER invent papers, citations, or unsupported novelty claims.`
  }

  return `\n\nROAST TARGET: RESEARCH TOPIC / IDEA (NO LITERATURE RETRIEVED)
The user wants you to roast their research topic: "${context.query}".
No matching ScholarXiv literature was found (or search was temporarily unavailable).
- Do NOT invent fake papers, authors, or citations.
- Proceed with roasting the scope, clarity, feasibility, and methodology of the idea itself.
- Keep "sources": [].`
}

import { extractPaperId } from '@/lib/scholarxiv'
import type { ChatTurn } from '@/lib/ai/complete'

export type VentDecision = {
  shouldSearch: boolean
  query: string | null
  state: 'broad' | 'focused' | 'refinement' | 'conversational'
  focusedDirection?: string
  missingDimensions?: string[]
}

// Conversational continuations that do not alter research focus
const CONVERSATIONAL_REGEX =
  /^(that('s| is)? (sounds?|looks?|seems?) (good|great|interesting|helpful|cool|awesome|fine|nice)|sounds (good|great|interesting|nice)|okay|ok|cool|great|thanks|thank you|got it|makes sense|i see|let's continue|what do you think|can you explain more|tell me more|yes|yep|sure|perfect)[\s.!,]*$/i

// Generic broad topic phrases that lack specific research dimensions
const VERY_BROAD_TOPIC_REGEX =
  /^(i (want to|would like to|'m interested in|am interested in) (research|study|explore|look into|investigate) )?(ai|artificial intelligence|education|machine learning|climate change|mental health|technology|healthcare|data science|computer science)[\s.!,]*$/i

const BROAD_EDUCATION_REGEX =
  /^(i('m| am)? (interested in|want to (research|study|explore|look into)) )?(ai and education|education and ai|ai in education|educational ai|technology in education)[\s.!,]*$/i

type DimensionMatches = {
  phenomenon: string[]
  population: string[]
  outcome: string[]
  context: string[]
}

const PHENOMENON_PATTERNS: [RegExp, string][] = [
  [/\b(chatgpt|gpt-4|gpt-3\.5|gpt)\b/i, 'ChatGPT'],
  [/\b(generative ai|genai)\b/i, 'generative AI'],
  [/\b(large language models?|llms?)\b/i, 'large language models'],
  [/\b(ai tools?|ai-assisted|ai tutors?|ai writing assistants?)\b/i, 'AI tools'],
  [/\b(machine learning|ml|deep learning)\b/i, 'machine learning'],
  [/\b(social media|screen time|smartphones?)\b/i, 'social media'],
  [/\b(artificial intelligence|ai)\b/i, 'AI'],
]

const POPULATION_PATTERNS: [RegExp, string][] = [
  [/\b(first[- ]year students?|freshm[ea]n)\b/i, 'first-year students'],
  [/\b(university students?|college students?|undergraduates?|graduates?)\b/i, 'university students'],
  [/\b(medical students?|engineering students?|stem students?|nursing students?)\b/i, 'medical students'],
  [/\b(high school students?|secondary school students?)\b/i, 'high school students'],
  [/\b(k[- ]12 students?|primary school (students?|pupils?)|elementary students?)\b/i, 'K-12 students'],
  [/\b(teachers?|educators?|instructors?|professors?|faculty)\b/i, 'educators'],
  [/\b(teenagers?|teens?|adolescents?|youth|children)\b/i, 'adolescents'],
]

const OUTCOME_PATTERNS: [RegExp, string][] = [
  [/\b(learning outcomes?|student learning)\b/i, 'learning outcomes'],
  [/\b(academic performance|grades|gpa|exam scores?)\b/i, 'academic performance'],
  [/\b(critical thinking|problem[- ]solving)\b/i, 'critical thinking'],
  [/\b(student engagement|engagement)\b/i, 'student engagement'],
  [/\b(retention|dropout rates?)\b/i, 'student retention'],
  [/\b(academic integrity|plagiarism|cheating)\b/i, 'academic integrity'],
  [/\b(dependence|over[- ]reliance|reliance)\b/i, 'student dependence'],
  [/\b(anxiety|depression|stress|well[- ]being|mental health)\b/i, 'mental health'],
  [/\b(cognitive load|comprehension|reading comprehension)\b/i, 'cognitive load'],
  [/\b(writing (skills?|performance|ability)|essay writing)\b/i, 'writing skills'],
]

const CONTEXT_PATTERNS: [RegExp, string][] = [
  [/\b(ethiopian?|ethiopia)\b/i, 'Ethiopian'],
  [/\b(african?|africa|sub[- ]saharan africa)\b/i, 'Africa'],
  [/\b(developing (countries|nations)|global south|low[- ]resource settings?)\b/i, 'developing countries'],
  [/\b(higher education institutions?|colleges? and universities?)\b/i, 'higher education'],
  [/\b(online (learning|education|classrooms?)|distance learning|remote learning|hybrid learning)\b/i, 'online learning'],
  [/\b(secondary education|high schools?)\b/i, 'secondary schools'],
]

function extractDimensions(text: string): DimensionMatches {
  const matches: DimensionMatches = {
    phenomenon: [],
    population: [],
    outcome: [],
    context: [],
  }

  for (const [pattern, label] of PHENOMENON_PATTERNS) {
    if (pattern.test(text) && !matches.phenomenon.includes(label)) {
      matches.phenomenon.push(label)
    }
  }

  for (const [pattern, label] of POPULATION_PATTERNS) {
    if (pattern.test(text) && !matches.population.includes(label)) {
      matches.population.push(label)
    }
  }

  for (const [pattern, label] of OUTCOME_PATTERNS) {
    if (pattern.test(text) && !matches.outcome.includes(label)) {
      matches.outcome.push(label)
    }
  }

  for (const [pattern, label] of CONTEXT_PATTERNS) {
    if (pattern.test(text) && !matches.context.includes(label)) {
      matches.context.push(label)
    }
  }

  return matches
}

/**
 * Builds a clean, focused search query from extracted research dimensions.
 */
function buildQueryFromDimensions(dims: DimensionMatches): string {
  const terms: string[] = []

  // Phenomenon (prefer ChatGPT or generative AI over generic AI)
  if (dims.phenomenon.length > 0) {
    const specificPhenom =
      dims.phenomenon.find((p) => p === 'ChatGPT' || p === 'generative AI' || p === 'large language models') ||
      dims.phenomenon.find((p) => p !== 'AI') ||
      dims.phenomenon[0]
    terms.push(specificPhenom)
  }

  // Outcome (e.g. learning outcomes, critical thinking)
  if (dims.outcome.length > 0) {
    terms.push(dims.outcome[0])
  }

  // Population (prefer specific subgroups over generic)
  if (dims.population.length > 0) {
    const specificPop =
      dims.population.find((p) => p === 'first-year students' || p === 'medical students') ||
      dims.population[0]
    terms.push(specificPop)
  }

  // Geography / Specific context (e.g. Ethiopian)
  const geoContext = dims.context.find((c) => c === 'Ethiopian' || c === 'Africa' || c === 'developing countries')
  if (geoContext) {
    terms.push(geoContext)
  }

  return terms.join(' ')
}

/**
 * Evaluates whether a Vent conversation turn is ready for ScholarXiv search,
 * needs narrowing question(s), represents a continued refinement, or is a minor continuation.
 */
export function assessVentReadiness(
  history: ChatTurn[],
  currentMessage: string,
  lastSearchedQuery?: string | null
): VentDecision {
  const trimmed = currentMessage.trim()

  // 1. If user provided a specific paper ID or URL, search immediately for that paper
  const paperId = extractPaperId(trimmed)
  if (paperId) {
    return {
      shouldSearch: true,
      query: paperId,
      state: 'focused',
      focusedDirection: `Paper ${paperId}`,
    }
  }

  // 2. Pure conversational continuation with existing history
  if (history.length > 0 && CONVERSATIONAL_REGEX.test(trimmed)) {
    return {
      shouldSearch: false,
      query: null,
      state: 'conversational',
    }
  }

  // 3. Obvious broad starter ideas without qualifiers
  if (VERY_BROAD_TOPIC_REGEX.test(trimmed) || BROAD_EDUCATION_REGEX.test(trimmed)) {
    return {
      shouldSearch: false,
      query: null,
      state: 'broad',
      missingDimensions: ['population', 'outcome or variable', 'context'],
    }
  }

  // 4. Extract dimensions from accumulated user context + current message
  const userTurns = history
    .filter((turn) => turn.role === 'user')
    .map((turn) => turn.content)
  const accumulatedUserText = [...userTurns, trimmed].join(' ')

  const currentDims = extractDimensions(trimmed)
  const accumulatedDims = extractDimensions(accumulatedUserText)

  const hasPhenomenon = accumulatedDims.phenomenon.length > 0
  const hasOutcome = accumulatedDims.outcome.length > 0
  const hasPopulation = accumulatedDims.population.length > 0
  const hasContext = accumulatedDims.context.length > 0

  // An idea is focused enough for ScholarXiv literature search when:
  // 1. It has a phenomenon AND an outcome AND at least one of (population, context)
  //    e.g. "How generative AI affects learning outcomes among university students"
  // 2. OR it has a phenomenon AND a specific outcome (even without explicit population)
  //    e.g. "impact of generative AI on learning outcomes"
  // 3. OR it has a phenomenon AND a population AND a specific geographical context
  //    e.g. "ChatGPT among university students in Ethiopia"
  const isFocused =
    hasPhenomenon &&
    ((hasOutcome && (hasPopulation || hasContext)) ||
      hasOutcome ||
      (hasPopulation && hasContext))

  if (!isFocused) {
    const missing: string[] = []
    if (!hasPopulation) missing.push('target population (e.g. university students, high school students)')
    if (!hasOutcome) missing.push('specific outcome or variable (e.g. learning outcomes, critical thinking, student engagement)')
    if (!hasContext) missing.push('educational setting or context (e.g. online learning, Ethiopian universities)')

    return {
      shouldSearch: false,
      query: null,
      state: 'broad',
      missingDimensions: missing,
    }
  }

  // 5. Construct the focused search query
  const focusedQuery = buildQueryFromDimensions(accumulatedDims)

  // 6. Check if this is a refinement of a previous focused query
  const isRefinement =
    Boolean(lastSearchedQuery) &&
    lastSearchedQuery?.toLowerCase() !== focusedQuery.toLowerCase() &&
    (currentDims.phenomenon.length > 0 || currentDims.population.length > 0 || currentDims.outcome.length > 0 || currentDims.context.length > 0)

  // 7. Prevent duplicate search if the query has not meaningfully changed
  if (lastSearchedQuery && lastSearchedQuery.toLowerCase() === focusedQuery.toLowerCase()) {
    return {
      shouldSearch: false,
      query: focusedQuery,
      state: 'conversational',
      focusedDirection: focusedQuery,
    }
  }

  return {
    shouldSearch: true,
    query: focusedQuery,
    state: isRefinement ? 'refinement' : 'focused',
    focusedDirection: focusedQuery,
  }
}

/**
 * Inspects past user turns in a conversation to determine the last focused query that was searched, if any.
 */
export function findLastVentQuery(history: ChatTurn[]): string | null {
  const userTurns = history.filter((turn) => turn.role === 'user')
  if (userTurns.length === 0) return null

  for (let i = userTurns.length - 1; i >= 0; i--) {
    const targetTurn = userTurns[i]
    const turnIndexInHistory = history.indexOf(targetTurn)
    const priorHistory = history.slice(0, turnIndexInHistory)
    const decision = assessVentReadiness(priorHistory, targetTurn.content)
    if (decision.shouldSearch && decision.query) {
      return decision.query
    }
  }

  return null
}

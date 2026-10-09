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

// Generic broad starter topic phrases that lack specific research dimensions
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
  // AI & Computing
  [/\b(chatgpt|gpt-4|gpt-3\.5|gpt)\b/i, 'ChatGPT'],
  [/\b(generative ai|genai)\b/i, 'generative AI'],
  [/\b(large language models?|llms?)\b/i, 'large language models'],
  [/\b(ai tools?|ai-assisted|ai tutors?|ai writing assistants?)\b/i, 'AI tools'],
  [/\b(machine learning|ml|deep learning)\b/i, 'machine learning'],
  [/\b(computer vision|nlp|natural language processing)\b/i, 'NLP'],
  [/\b(robotics|automation|iot|cybersecurity)\b/i, 'automation'],
  [/\b(social media|screen time|smartphones?)\b/i, 'social media'],
  [/\b(artificial intelligence|ai)\b/i, 'AI'],
  // Health & Medicine
  [/\b(telehealth|telemedicine|digital health|clinical decision support)\b/i, 'telehealth'],
  [/\b(vaccines?|diagnostics?|drug discovery|treatment)\b/i, 'medical intervention'],
  // Energy, Climate & Environment
  [/\b(renewable energy|solar energy|wind energy|microgrids?)\b/i, 'renewable energy'],
  [/\b(climate change|drought|irrigation|soil salinity|deforestation)\b/i, 'climate change'],
  // Business & Socio-economics
  [/\b(remote work|telework|hybrid work)\b/i, 'remote work'],
  [/\b(microfinance|mobile money|fintech)\b/i, 'microfinance'],
]

const POPULATION_PATTERNS: [RegExp, string][] = [
  // Students & Educators
  [/\b(first[- ]year students?|freshm[ea]n)\b/i, 'first-year students'],
  [/\b(university students?|college students?|undergraduates?|graduates?)\b/i, 'university students'],
  [/\b(medical students?|engineering students?|stem students?|nursing students?)\b/i, 'medical students'],
  [/\b(high school students?|secondary school students?)\b/i, 'high school students'],
  [/\b(k[- ]12 students?|primary school (students?|pupils?)|elementary students?)\b/i, 'K-12 students'],
  [/\b(teachers?|educators?|instructors?|professors?|faculty)\b/i, 'educators'],
  [/\b(teenagers?|teens?|adolescents?|youth|children)\b/i, 'adolescents'],
  // Healthcare Workers & Patients
  [/\b(nurses?|nursing staff)\b/i, 'nurses'],
  [/\b(doctors?|physicians?|clinicians?|healthcare workers?)\b/i, 'clinicians'],
  [/\b(patients?|elderly|caregivers?)\b/i, 'patients'],
  // Professionals, Farmers & Communities
  [/\b(farmers?|smallholders?|cooperatives?)\b/i, 'farmers'],
  [/\b(workers?|employees?|managers?|staff)\b/i, 'workers'],
  [/\b(entrepreneurs?|women entrepreneurs?)\b/i, 'entrepreneurs'],
]

const OUTCOME_PATTERNS: [RegExp, string][] = [
  // Academic & Cognitive
  [/\b(learning outcomes?|student learning)\b/i, 'learning outcomes'],
  [/\b(academic performance|grades|gpa|exam scores?)\b/i, 'academic performance'],
  [/\b(critical thinking|problem[- ]solving)\b/i, 'critical thinking'],
  [/\b(student engagement|engagement)\b/i, 'student engagement'],
  [/\b(retention|dropout rates?)\b/i, 'student retention'],
  [/\b(academic integrity|plagiarism|cheating)\b/i, 'academic integrity'],
  [/\b(dependence|over[- ]reliance|reliance)\b/i, 'student dependence'],
  [/\b(cognitive load|comprehension|reading comprehension)\b/i, 'cognitive load'],
  [/\b(writing (skills?|performance|ability)|essay writing)\b/i, 'writing skills'],
  // Psychological & Health
  [/\b(burnout|exhaustion|compassion fatigue)\b/i, 'burnout'],
  [/\b(anxiety|depression|stress|well[- ]being|mental health)\b/i, 'mental health'],
  [/\b(patient safety|medical errors?|clinical errors?)\b/i, 'patient safety'],
  // Performance, Productivity & Environmental
  [/\b(productivity|job performance|efficiency)\b/i, 'productivity'],
  [/\b(job satisfaction|turnover|morale)\b/i, 'job satisfaction'],
  [/\b(crop yield|water use|energy efficiency|sustainability)\b/i, 'sustainability'],
  [/\b(adoption rates?|technology adoption|acceptance)\b/i, 'technology adoption'],
]

const CONTEXT_PATTERNS: [RegExp, string][] = [
  // Geography
  [/\b(ethiopian?|ethiopia)\b/i, 'Ethiopian'],
  [/\b(african?|africa|sub[- ]saharan africa)\b/i, 'Africa'],
  [/\b(developing (countries|nations)|global south|low[- ]resource settings?)\b/i, 'developing countries'],
  // Institutional / Physical settings
  [/\b(higher education institutions?|colleges? and universities?)\b/i, 'higher education'],
  [/\b(online (learning|education|classrooms?)|distance learning|remote learning|hybrid learning)\b/i, 'online learning'],
  [/\b(secondary education|high schools?)\b/i, 'secondary schools'],
  [/\b(hospitals?|icus?|intensive care units?|clinics?|rural health centers?)\b/i, 'hospitals'],
  [/\b(rural|rural areas?|villages?|remote communities)\b/i, 'rural settings'],
  [/\b(workplaces?|corporate|small businesses?|enterprises?)\b/i, 'workplace'],
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
 * Builds a clean search query from extracted research dimensions.
 */
function buildQueryFromDimensions(dims: DimensionMatches): string {
  const terms: string[] = []

  // Phenomenon (prefer specific tool/concept)
  if (dims.phenomenon.length > 0) {
    const specificPhenom =
      dims.phenomenon.find((p) => p === 'ChatGPT' || p === 'generative AI' || p === 'large language models') ||
      dims.phenomenon.find((p) => p !== 'AI') ||
      dims.phenomenon[0]
    terms.push(specificPhenom)
  }

  // Outcome (e.g. learning outcomes, burnout, critical thinking)
  if (dims.outcome.length > 0) {
    terms.push(dims.outcome[0])
  }

  // Population (prefer specific subgroups over generic)
  if (dims.population.length > 0) {
    const specificPop =
      dims.population.find((p) => p === 'first-year students' || p === 'medical students' || p === 'nurses') ||
      dims.population[0]
    terms.push(specificPop)
  }

  // Geography / Specific context (e.g. Ethiopian)
  const geoContext = dims.context.find((c) => c === 'Ethiopian' || c === 'Africa' || c === 'developing countries')
  if (geoContext) {
    terms.push(geoContext)
  } else if (dims.context.length > 0) {
    terms.push(dims.context[0])
  }

  return terms.join(' ')
}

/**
 * Extracts substantive non-stopword research terms from freeform text
 * when predefined dictionary patterns don't capture specialized domains.
 */
function extractSubstantiveQuery(text: string): string {
  const cleaned = text
    .replace(/\b(i (want to|would like to|'m interested in|am interested in|wonder if|am wondering) (research|study|explore|look into|investigate|focus on|know))\b/gi, '')
    .replace(/\b(can you help me (with|narrow down|find)|what about|how about|i'm thinking about|i think|maybe|actually|let's focus on|i like the angle on|i like)\b/gi, '')
    .replace(/\b(how does|how do|what is the impact of|what are the effects of|impact of|effect of|role of|influence of)\b/gi, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'about', 'into',
    'over', 'more', 'some', 'any', 'are', 'was', 'were', 'have', 'has',
    'been', 'their', 'there', 'they', 'them', 'these', 'those', 'such',
  ])
  const words = cleaned.split(' ').filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()))
  return words.slice(0, 5).join(' ')
}

/**
 * Evaluates whether a Vent conversation turn is ready for ScholarXiv search,
 * needs narrowing assistance, represents a continued refinement, or is a minor continuation.
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

  // 2. Pure conversational continuation with existing history (acknowledgments, short agreement)
  if (history.length > 0 && CONVERSATIONAL_REGEX.test(trimmed)) {
    return {
      shouldSearch: false,
      query: null,
      state: 'conversational',
    }
  }

  // 3. Obvious broad starter ideas without qualifiers on initial turn
  if (history.length === 0 && (VERY_BROAD_TOPIC_REGEX.test(trimmed) || BROAD_EDUCATION_REGEX.test(trimmed))) {
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
  // 2. OR it has a phenomenon AND a specific outcome
  // 3. OR it has a phenomenon AND a population AND a specific context
  // 4. OR this is a multi-turn conversation (userTurns >= 1) where the user has chosen an angle or provided further focus!
  const hasStructuredDimensions =
    hasPhenomenon &&
    ((hasOutcome && (hasPopulation || hasContext)) ||
      hasOutcome ||
      (hasPopulation && hasContext))

  // If multi-turn and user provides substance (>= 3 words), prevent endless interrogation
  const hasMultiTurnSubstance = userTurns.length >= 1 && trimmed.split(/\s+/).length >= 2

  const isFocused = hasStructuredDimensions || hasMultiTurnSubstance

  if (!isFocused && history.length === 0) {
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
  let focusedQuery = buildQueryFromDimensions(accumulatedDims)
  if (!focusedQuery || focusedQuery.trim().split(/\s+/).length < 2) {
    const fallbackQuery = extractSubstantiveQuery(accumulatedUserText)
    if (fallbackQuery) {
      focusedQuery = fallbackQuery
    }
  }

  // 6. Check if this is a refinement of a previous focused query
  const isRefinement =
    Boolean(lastSearchedQuery) &&
    lastSearchedQuery?.toLowerCase() !== focusedQuery.toLowerCase() &&
    (currentDims.phenomenon.length > 0 || currentDims.population.length > 0 || currentDims.outcome.length > 0 || currentDims.context.length > 0 || trimmed.length > 10)

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

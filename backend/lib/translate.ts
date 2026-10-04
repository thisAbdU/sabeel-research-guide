import { addisEnv } from '@/lib/env'

export type SupportedLanguage = 'en' | 'am' | 'om'

// Ethiopic Unicode script block for Amharic
const AMHARIC_REGEX = /[\u1200-\u137F]/

// High-frequency distinctive Afan Oromo words and morphological patterns
const AFAN_OROMO_REGEX =
  /\b(akkam|akkamitti|jirtu|barumsa|qorannoo|barattoota|waan|waa'ee|isaa|ishee|isaani|yookiin|garuu|kanaaf|dhimma|keessa|irratti|biyya|itti|argadheera|barbaada|maal|maalif|eenyu|akkasumas|hunda|nama|namoota|danda'a|danda'u|godhu|ta'uu|akkana|akkas|akkuma|fayyaa|barnoota|saayinsii|kompiitaraa|qorachuu|akkamta|fayyadama)\b/i

/**
 * Detect whether text is in Amharic ('am'), Afan Oromo ('om'), or English ('en').
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (!text || typeof text !== 'string') return 'en'
  const trimmed = text.trim()
  if (!trimmed) return 'en'

  // If contains Ethiopic Unicode characters, it is Amharic
  if (AMHARIC_REGEX.test(trimmed)) {
    return 'am'
  }

  // If contains characteristic Afan Oromo vocabulary/grammar markers
  if (AFAN_OROMO_REGEX.test(trimmed)) {
    return 'om'
  }

  return 'en'
}

/**
 * Translate text between English, Amharic, and Afan Oromo using Addis AI.
 * Protects markdown URLs from alteration.
 * Falls back gracefully to original text if translation service is unavailable.
 */
export async function translateText({
  text,
  from,
  to,
}: {
  text: string
  from: SupportedLanguage
  to: SupportedLanguage
}): Promise<string> {
  if (!text || typeof text !== 'string') return ''
  const trimmed = text.trim()
  if (!trimmed || from === to) return text

  const { baseUrl, apiKey } = addisEnv()
  if (!apiKey) {
    console.warn('[translate] ADDIS_API_KEY is not configured, returning original text')
    return text
  }

  // Preserve URLs (e.g. ScholarXiv links) from being altered during neural translation
  const urlMap: string[] = []
  const textWithProtectedUrls = text.replace(/https?:\/\/[^\s\)]+/g, (match) => {
    urlMap.push(match)
    return `__SCHOLARXIV_URL_${urlMap.length - 1}__`
  })

  try {
    const response = await fetch(`${baseUrl}/api/v1/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        text: textWithProtectedUrls,
        source_language: from,
        target_language: to,
      }),
      signal: AbortSignal.timeout(12_000),
    })

    if (!response.ok) {
      console.warn(`[translate] Addis AI returned status ${response.status}`)
      return text
    }

    const payload = (await response.json()) as {
      status?: string
      data?: {
        translation?: string
      }
    }

    const rawTranslation = payload?.data?.translation
    if (typeof rawTranslation !== 'string' || !rawTranslation.trim()) {
      return text
    }

    // Restore original protected URLs
    const restoredTranslation = rawTranslation.replace(
      /__SCHOLARXIV_URL_(\d+)__/g,
      (_, idx) => urlMap[Number(idx)] || ''
    )

    return restoredTranslation
  } catch (err) {
    console.warn('[translate] Translation request failed, falling back to original text:', err)
    return text
  }
}

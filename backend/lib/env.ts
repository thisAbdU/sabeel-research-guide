function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

export function supabaseEnv() {
  return {
    url: required('SUPABASE_URL'),
    anonKey: required('SUPABASE_ANON_KEY'),
  }
}

export function aiEnv() {
  return {
    baseUrl: (process.env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, ''),
    apiKey: required('AI_API_KEY'),
    model: process.env.AI_MODEL ?? 'gpt-4o-mini',
  }
}

export function scholarxivEnv() {
  return {
    baseUrl: (process.env.SCHOLARXIV_BASE_URL ?? 'https://www.scholarxiv.com').replace(/\/$/, ''),
    apiKey: process.env.SCHOLARXIV_API_KEY ?? '',
  }
}


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

export function linksEtEnv() {
  return {
    baseUrl: (process.env.LINKS_ET_BASE_URL ?? 'https://links.et').replace(/\/$/, ''),
    apiKey: required('LINKS_ET_API_KEY'),
  }
}

export function addisEnv() {
  return {
    baseUrl: (process.env.ADDIS_BASE_URL ?? 'https://api.addisassistant.com').replace(/\/$/, ''),
    apiKey: process.env.ADDIS_API_KEY ?? '',
  }
}

export function voxideEnv() {
  return {
    publicKey: (process.env.VOXIDE_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VOXIDE_PUBLIC_KEY ?? '').trim(),
  }
}


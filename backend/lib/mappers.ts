import type { User } from '@supabase/supabase-js'
import type {
  Conversation,
  FundingMatch,
  Message,
  PublicUser,
  ResearchProject,
  Session,
  SupportSettings,
  SupportTransaction,
} from '@/lib/types'

type UserRow = { display_name: string | null }

export function toPublicUser(user: User, profile?: UserRow | null): PublicUser {
  return {
    id: user.id,
    email: user.email ?? null,
    displayName:
      profile?.display_name ??
      (typeof user.user_metadata?.display_name === 'string'
        ? user.user_metadata.display_name
        : null),
  }
}

export function toSession(session: {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at?: number
}): Session {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
    expiresAt: session.expires_at,
  }
}

export function toConversation(row: {
  id: string
  user_id: string
  research_project_id: string | null
  mode: Conversation['mode']
  title: string | null
  created_at: string
  updated_at: string
}): Conversation {
  return {
    id: row.id,
    userId: row.user_id,
    researchProjectId: row.research_project_id,
    mode: row.mode,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toMessage(row: {
  id: string
  conversation_id: string
  role: Message['role']
  content: string
  created_at: string
}): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }
}

export function toResearchProject(
  row: {
    id: string
    title: string
    researcher_name: string | null
    description: string | null
    abstract: string | null
    field: string | null
    keywords: string[] | null
    research_url: string | null
    institution: string | null
    location: string | null
    is_published: boolean
    created_at: string
    updated_at: string
  },
  supportEnabled = false,
): ResearchProject {
  return {
    id: row.id,
    title: row.title,
    researcherName: row.researcher_name,
    description: row.description,
    abstract: row.abstract,
    field: row.field,
    keywords: row.keywords ?? [],
    researchUrl: row.research_url,
    institution: row.institution,
    location: row.location,
    visibility: row.is_published ? 'public' : 'private',
    supportEnabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toDiscoverResearch(row: {
  id: string
  user_id: string
  title: string
  researcher_name: string | null
  field: string | null
  description: string | null
  research_url: string | null
  institution: string | null
  location: string | null
}, supportEnabled = false) {
  return {
    id: row.id,
    title: row.title,
    researcher: {
      id: row.user_id,
      name: row.researcher_name?.trim() || 'Researcher',
    },
    field: row.field,
    description: row.description,
    researchUrl: row.research_url,
    institution: row.institution,
    location: row.location,
    supportEnabled,
  }
}

export function toFundingMatch(row: {
  id: string
  research_project_id: string
  organization_name: string
  program_name: string | null
  description: string | null
  url: string | null
  relevance_note: string | null
  relevance_score: number | null
  created_at: string
}): FundingMatch {
  return {
    id: row.id,
    researchProjectId: row.research_project_id,
    organizationName: row.organization_name,
    programName: row.program_name,
    description: row.description,
    url: row.url,
    relevanceNote: row.relevance_note,
    relevanceScore: row.relevance_score,
    createdAt: row.created_at,
  }
}

export function toSupportSettings(row: {
  id: string
  user_id: string
  research_project_id: string
  enabled: boolean
  payment_provider: string | null
  payment_account_id: string | null
  created_at: string
  updated_at: string
}): SupportSettings {
  return {
    id: row.id,
    userId: row.user_id,
    researchProjectId: row.research_project_id,
    enabled: row.enabled,
    paymentProvider: row.payment_provider,
    paymentAccountId: row.payment_account_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toSupportTransaction(row: {
  id: string
  support_settings_id: string
  research_project_id: string
  supporter_user_id: string | null
  amount: number | string
  currency: string
  status: SupportTransaction['status']
  provider_payment_id: string | null
  created_at: string
}): SupportTransaction {
  return {
    id: row.id,
    supportSettingsId: row.support_settings_id,
    researchProjectId: row.research_project_id,
    supporterUserId: row.supporter_user_id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    providerPaymentId: row.provider_payment_id,
    createdAt: row.created_at,
  }
}

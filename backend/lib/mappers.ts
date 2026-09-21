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

export function toResearchProject(row: {
  id: string
  user_id: string
  title: string
  summary: string | null
  content: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}): ResearchProject {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    isPublished: row.is_published,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

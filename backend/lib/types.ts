export type ChatMode = 'vent' | 'roast' | 'funding'
export type MessageRole = 'user' | 'assistant' | 'system'

export type ResearchSource = {
  id: string
  title: string
  authors: string[]
  summary?: string
  url: string
  source: string
  year?: string
}

export type ChatRequest = {
  mode: ChatMode
  conversationId: string | null
  message: string
}

export type ChatReply = {
  id: string
  role: 'assistant'
  content: string
  createdAt: string
}

export type ResearchDirection = {
  title: string
  description: string
  researchQuestion: string
}

export type ChatResponse = {
  data: {
    conversationId: string
    message: ChatReply
    sources: ResearchSource[]
    researchDirections: ResearchDirection[]
  }
}

export type SupportStatus = 'pending' | 'completed' | 'failed'

export type PublicUser = {
  id: string
  email: string | null
  displayName: string | null
}

export type Session = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  expiresAt?: number
}

export type AuthResponse = {
  user: PublicUser
  session: Session | null
}

export type Conversation = {
  id: string
  userId: string
  researchProjectId: string | null
  mode: ChatMode
  title: string | null
  createdAt: string
  updatedAt: string
}

export type Message = {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  createdAt: string
}

export type ResearchVisibility = 'private' | 'public'

export type ResearchProject = {
  id: string
  title: string
  researcherName: string | null
  description: string | null
  abstract: string | null
  field: string | null
  keywords: string[]
  researchUrl: string | null
  institution: string | null
  location: string | null
  visibility: ResearchVisibility
  supportEnabled: boolean
  createdAt: string
  updatedAt: string
}

export type FundingMatch = {
  id: string
  researchProjectId: string
  organizationName: string
  programName: string | null
  description: string | null
  url: string | null
  relevanceNote: string | null
  relevanceScore: number | null
  createdAt: string
}

export type SupportSettings = {
  id: string
  userId: string
  researchProjectId: string
  enabled: boolean
  paymentProvider: string | null
  paymentAccountId: string | null
  createdAt: string
  updatedAt: string
}

export type SupportTransaction = {
  id: string
  supportSettingsId: string
  researchProjectId: string
  supporterUserId: string | null
  amount: number
  currency: string
  status: SupportStatus
  providerPaymentId: string | null
  createdAt: string
}

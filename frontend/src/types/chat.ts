export type ChatMode = 'vent' | 'roast' | 'funding';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ResearchSource {
  id: string;
  title: string;
  authors: string[];
  summary?: string;
  url: string;
  source: string;
  year?: string;
}

export interface ResearchDirection {
  title: string;
  description: string;
  researchQuestion: string;
}

export interface ChatRequestPayload {
  mode: ChatMode;
  conversationId: string | null;
  message: string;
}

export interface ChatResponseData {
  conversationId: string;
  message: {
    id: string;
    role: 'assistant';
    content: string;
    createdAt: string;
  };
  sources: ResearchSource[];
  researchDirections: ResearchDirection[];
}

export interface ChatMessageItem {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string | Date;
  mode: ChatMode;
  sources?: ResearchSource[];
  researchDirections?: (ResearchDirection | string)[];
  isError?: boolean;
}

export interface ModeConfig {
  id: ChatMode;
  title: string;
  tagline: string;
  subtitle: string;
  placeholder: string;
  starterQuestions: string[];
}

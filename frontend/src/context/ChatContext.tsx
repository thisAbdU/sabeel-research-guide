"use client";

import * as React from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ChatApiError,
  getConversation,
  listConversations,
  sendChatMessage,
} from "@/services/chat";
import type {
  ChatMessageItem,
  ChatMode,
  ConversationMeta,
  ResearchSource,
} from "@/types/chat";

type ThreadCache = Map<string, ChatMessageItem[]>;

interface ChatContextType {
  conversations: ConversationMeta[];
  activeId: string | null;
  currentMode: ChatMode;
  messages: ChatMessageItem[];
  sessionSources: ResearchSource[];
  isLoadingList: boolean;
  isLoadingThread: boolean;
  isSending: boolean;
  activity: string | null;
  errorBanner: string | null;
  listHasMore: boolean;
  setCurrentMode: (mode: ChatMode) => void;
  setErrorBanner: (msg: string | null) => void;
  setSelectedSource: (source: ResearchSource | null) => void;
  selectedSource: ResearchSource | null;
  refreshConversations: () => Promise<void>;
  loadMoreConversations: () => Promise<void>;
  openConversation: (id: string) => Promise<void>;
  startNewChat: (mode?: ChatMode) => void;
  sendMessage: (content: string) => Promise<string | null>;
}

const ChatContext = React.createContext<ChatContextType | undefined>(undefined);

function toChatItems(
  rows: { id: string; role: string; content: string; createdAt: string }[],
  mode: ChatMode
): ChatMessageItem[] {
  return rows.map((row) => ({
    id: row.id,
    role: row.role as ChatMessageItem["role"],
    content: row.content,
    createdAt: row.createdAt,
    mode,
  }));
}

function upsertMeta(
  list: ConversationMeta[],
  next: ConversationMeta
): ConversationMeta[] {
  const without = list.filter((c) => c.id !== next.id);
  return [next, ...without].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();

  const [conversations, setConversations] = React.useState<ConversationMeta[]>([]);
  const [listCursor, setListCursor] = React.useState<string | null>(null);
  const [listHasMore, setListHasMore] = React.useState(false);
  const [isLoadingList, setIsLoadingList] = React.useState(false);

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [currentMode, setCurrentModeState] = React.useState<ChatMode>("vent");
  const [threads, setThreads] = React.useState<ThreadCache>(() => new Map());
  const [isLoadingThread, setIsLoadingThread] = React.useState(false);

  const [isSending, setIsSending] = React.useState(false);
  const [activity, setActivity] = React.useState<string | null>(null);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [sessionSources, setSessionSources] = React.useState<ResearchSource[]>([]);
  const [selectedSource, setSelectedSource] = React.useState<ResearchSource | null>(null);

  const activeIdRef = React.useRef(activeId);
  activeIdRef.current = activeId;
  const loadingThreadRef = React.useRef<string | null>(null);
  const threadsRef = React.useRef(threads);
  threadsRef.current = threads;
  const conversationsRef = React.useRef(conversations);
  conversationsRef.current = conversations;

  const messages = React.useMemo(() => {
    if (!activeId) return [];
    return threads.get(activeId) ?? [];
  }, [activeId, threads]);

  const patchThread = React.useCallback(
    (id: string, updater: (prev: ChatMessageItem[]) => ChatMessageItem[]) => {
      setThreads((prev) => {
        const next = new Map(prev);
        next.set(id, updater(prev.get(id) ?? []));
        return next;
      });
    },
    []
  );

  const refreshConversations = React.useCallback(async () => {
    if (!user) {
      setConversations([]);
      setListCursor(null);
      setListHasMore(false);
      return;
    }

    setIsLoadingList(true);
    try {
      const { conversations: rows, page } = await listConversations({ limit: 30 });
      setConversations(rows);
      setListCursor(page.nextCursor);
      setListHasMore(page.hasMore);
    } catch (err) {
      console.error("[chat] list failed", err);
    } finally {
      setIsLoadingList(false);
    }
  }, [user]);

  const loadMoreConversations = React.useCallback(async () => {
    if (!user || !listHasMore || !listCursor || isLoadingList) return;
    setIsLoadingList(true);
    try {
      const { conversations: rows, page } = await listConversations({
        limit: 30,
        cursor: listCursor,
      });
      setConversations((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });
      setListCursor(page.nextCursor);
      setListHasMore(page.hasMore);
    } catch (err) {
      console.error("[chat] list more failed", err);
    } finally {
      setIsLoadingList(false);
    }
  }, [user, listHasMore, listCursor, isLoadingList]);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setConversations([]);
      setActiveId(null);
      setThreads(new Map());
      setSessionSources([]);
      return;
    }
    void refreshConversations();
  }, [authLoading, user, refreshConversations]);

  const openConversation = React.useCallback(async (id: string) => {
    setErrorBanner(null);
    setSelectedSource(null);
    setActiveId(id);

    const meta = conversationsRef.current.find((c) => c.id === id);
    if (meta) setCurrentModeState(meta.mode);

    if (threadsRef.current.has(id)) {
      setSessionSources([]);
      return;
    }

    loadingThreadRef.current = id;
    setIsLoadingThread(true);
    try {
      const { conversation, messages: rows } = await getConversation(id, {
        limit: 50,
      });
      // Stale response — user already switched away
      if (loadingThreadRef.current !== id) return;

      setConversations((prev) => upsertMeta(prev, conversation));
      setCurrentModeState(conversation.mode);
      setThreads((prev) => {
        const next = new Map(prev);
        next.set(id, toChatItems(rows, conversation.mode));
        return next;
      });
      setSessionSources([]);
    } catch (err) {
      if (loadingThreadRef.current !== id) return;
      const msg =
        err instanceof ChatApiError
          ? err.message
          : "Failed to load conversation";
      setErrorBanner(msg);
      if (err instanceof ChatApiError && err.status === 404) {
        setActiveId(null);
        setConversations((prev) => prev.filter((c) => c.id !== id));
      }
    } finally {
      if (loadingThreadRef.current === id) {
        loadingThreadRef.current = null;
        setIsLoadingThread(false);
      }
    }
  }, []);

  const startNewChat = React.useCallback((mode?: ChatMode) => {
    setActiveId(null);
    setSessionSources([]);
    setSelectedSource(null);
    setErrorBanner(null);
    setActivity(null);
    if (mode) setCurrentModeState(mode);
  }, []);

  const setCurrentMode = React.useCallback((mode: ChatMode) => {
    setCurrentModeState((prev) => {
      if (mode === prev) return prev;
      setActiveId(null);
      setSessionSources([]);
      setSelectedSource(null);
      setErrorBanner(null);
      return mode;
    });
  }, []);

  const sendMessage = React.useCallback(
    async (content: string): Promise<string | null> => {
      const trimmed = content.trim();
      if (!trimmed || isSending) return null;

      setErrorBanner(null);

      const tempUserId = `temp-user-${Date.now()}`;
      const mode = currentMode;
      let threadId = activeId;

      if (!threadId) {
        threadId = `temp-${Date.now()}`;
        setActiveId(threadId);
        setThreads((prev) => {
          const next = new Map(prev);
          next.set(threadId!, []);
          return next;
        });
      }

      const userMsg: ChatMessageItem = {
        id: tempUserId,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
        mode,
      };

      patchThread(threadId, (prev) => [...prev, userMsg]);
      setActivity(null);
      setIsSending(true);

      const conversationIdForApi = threadId.startsWith("temp-") ? null : threadId;

      try {
        const result = await sendChatMessage(
          {
            mode,
            conversationId: conversationIdForApi,
            message: trimmed,
          },
          (text) => setActivity(text)
        );

        const realId = result.conversationId;
        const wasTemp = threadId.startsWith("temp-");
        const existingMeta = conversationsRef.current.find((c) => c.id === realId);

        const assistantMsg: ChatMessageItem = {
          id: result.message.id || `asst-${Date.now()}`,
          role: "assistant",
          content: result.message.content,
          createdAt: result.message.createdAt || new Date().toISOString(),
          mode,
          sources:
            result.sources && result.sources.length > 0
              ? result.sources
              : undefined,
          researchDirections:
            result.researchDirections && result.researchDirections.length > 0
              ? result.researchDirections
              : undefined,
        };

        setThreads((prev) => {
          const next = new Map(prev);
          const existing = next.get(threadId!) ?? [];
          const reconciled = existing.map((m) =>
            m.id === tempUserId && result.userMessage
              ? {
                  ...m,
                  id: result.userMessage.id,
                  createdAt: result.userMessage.createdAt,
                }
              : m
          );
          const withAssistant = [...reconciled, assistantMsg];

          if (wasTemp && realId !== threadId) {
            next.delete(threadId!);
            next.set(realId, withAssistant);
          } else {
            next.set(realId, withAssistant);
          }
          return next;
        });

        if (wasTemp || activeIdRef.current === threadId) {
          setActiveId(realId);
        }

        const meta: ConversationMeta = {
          id: realId,
          mode,
          title:
            result.conversation?.title ??
            existingMeta?.title ??
            trimmed.slice(0, 80),
          messageCount:
            result.conversation?.messageCount ??
            (existingMeta?.messageCount ?? 0) + 2,
          lastMessagePreview:
            result.conversation?.lastMessagePreview ??
            result.message.content.slice(0, 120),
          createdAt: existingMeta?.createdAt ?? new Date().toISOString(),
          updatedAt: result.conversation?.updatedAt ?? new Date().toISOString(),
        };
        setConversations((prev) => upsertMeta(prev, meta));

        if (result.sources && result.sources.length > 0) {
          setSessionSources((prev) => {
            const keys = new Set(prev.map((s) => s.id || s.title));
            const fresh = result.sources.filter(
              (s) => !keys.has(s.id || s.title)
            );
            return [...fresh, ...prev];
          });
        }

        return result.message.content;
      } catch (err) {
        const errorMessage =
          err instanceof ChatApiError
            ? err.message
            : "Something went wrong while processing your research request. Please try again.";

        patchThread(threadId, (prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: errorMessage,
            createdAt: new Date().toISOString(),
            mode,
            isError: true,
          },
        ]);
        setErrorBanner(errorMessage);
        return null;
      } finally {
        setActivity(null);
        setIsSending(false);
      }
    },
    [activeId, currentMode, isSending, patchThread]
  );

  const value = React.useMemo<ChatContextType>(
    () => ({
      conversations,
      activeId,
      currentMode,
      messages,
      sessionSources,
      isLoadingList,
      isLoadingThread,
      isSending,
      activity,
      errorBanner,
      listHasMore,
      setCurrentMode,
      setErrorBanner,
      setSelectedSource,
      selectedSource,
      refreshConversations,
      loadMoreConversations,
      openConversation,
      startNewChat,
      sendMessage,
    }),
    [
      conversations,
      activeId,
      currentMode,
      messages,
      sessionSources,
      isLoadingList,
      isLoadingThread,
      isSending,
      activity,
      errorBanner,
      listHasMore,
      setCurrentMode,
      selectedSource,
      refreshConversations,
      loadMoreConversations,
      openConversation,
      startNewChat,
      sendMessage,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextType {
  const ctx = React.useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}

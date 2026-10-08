"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Flame,
  Coins,
  BookOpen,
  Info,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { SourceCard } from "@/components/chat/SourceCard";
import { SourceDetailsPanel } from "@/components/chat/SourceDetailsPanel";
import { Card } from "@/components/ui/Card";
import { ChatMode, ResearchSource } from "@/types/chat";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useVoicePipeline } from "@/hooks/useVoicePipeline";
import { LiveVoiceOrb } from "@/components/chat/LiveVoiceOrb";
import { PublishOfferModal } from "@/components/chat/PublishOfferModal";
import { VoxideKeyReplacementModal } from "@/components/chat/VoxideKeyReplacementModal";
import {
  funderKey,
  listFundingMatches,
  removeFundingMatch,
  saveFundingMatch,
  type FundingMatch,
} from "@/services/funding";

function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const {
    activeId,
    currentMode,
    messages,
    sessionSources,
    isLoadingThread,
    isSending,
    activity,
    errorBanner,
    selectedSource,
    setCurrentMode,
    setErrorBanner,
    setSelectedSource,
    openConversation,
    startNewChat,
    sendMessage,
    suggestPublish,
    publishPaperUrl,
    clearPublishOffer,
  } = useChat();

  const [publishOpen, setPublishOpen] = React.useState(false);
  const [savedMatches, setSavedMatches] = React.useState<FundingMatch[]>([]);
  const [savingKeys, setSavingKeys] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    if (suggestPublish && currentMode === "funding") {
      setPublishOpen(true);
    }
  }, [suggestPublish, currentMode]);

  React.useEffect(() => {
    if (!user || currentMode !== "funding" || !activeId || activeId.startsWith("temp-")) {
      setSavedMatches([]);
      return;
    }
    let cancelled = false;
    void listFundingMatches({ conversationId: activeId })
      .then((res) => {
        if (!cancelled) setSavedMatches(res.matches ?? []);
      })
      .catch(() => {
        if (!cancelled) setSavedMatches([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, currentMode, activeId]);

  const savedKeySet = React.useMemo(() => {
    const keys = new Set<string>();
    for (const match of savedMatches) {
      keys.add(
        funderKey({
          organizationName: match.organizationName,
          url: match.url,
        })
      );
    }
    return keys;
  }, [savedMatches]);

  const isFunderSaved = React.useCallback(
    (source: ResearchSource) => savedKeySet.has(funderKey(source)),
    [savedKeySet]
  );

  const isFunderSaving = React.useCallback(
    (source: ResearchSource) => savingKeys.has(funderKey(source)),
    [savingKeys]
  );

  const toggleSaveFunder = React.useCallback(
    async (source: ResearchSource) => {
      if (!activeId || activeId.startsWith("temp-")) {
        setErrorBanner("Send a message first, then save funders from this conversation.");
        return;
      }
      const key = funderKey(source);
      if (savingKeys.has(key)) return;

      setSavingKeys((prev) => new Set(prev).add(key));
      setErrorBanner(null);
      try {
        const existing = savedMatches.find(
          (m) =>
            funderKey({
              organizationName: m.organizationName,
              url: m.url,
            }) === key
        );
        if (existing) {
          await removeFundingMatch(existing.id);
          setSavedMatches((prev) => prev.filter((m) => m.id !== existing.id));
        } else {
          const res = await saveFundingMatch({
            conversationId: activeId,
            source,
          });
          setSavedMatches((prev) => {
            if (prev.some((m) => m.id === res.match.id)) return prev;
            return [res.match, ...prev];
          });
        }
      } catch (err) {
        setErrorBanner(
          err instanceof Error ? err.message : "Could not update saved funder"
        );
      } finally {
        setSavingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [activeId, savedMatches, savingKeys, setErrorBanner]
  );

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const openedFromQuery = React.useRef<string | null>(null);
  const prevActiveId = React.useRef<string | null>(null);
  const conversationId = searchParams.get("c");

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  // URL is source of truth for switching history items
  React.useEffect(() => {
    if (authLoading || !user) return;
    if (!conversationId) {
      openedFromQuery.current = null;
      return;
    }
    if (openedFromQuery.current === conversationId) return;
    openedFromQuery.current = conversationId;
    void openConversation(conversationId);
  }, [authLoading, user, conversationId, openConversation]);

  const modeConfigs: Record<
    ChatMode,
    {
      title: string;
      headline: string;
      emptyStateQuote: string;
      suggestedPrompts: string[];
      icon: React.ComponentType<{ className?: string }>;
    }
  > = {
    vent: {
      title: "Vent",
      headline: "Ideation & Topic Framing",
      emptyStateQuote:
        "You have an idea. Let's figure out what you're actually trying to research.",
      suggestedPrompts: [
        "I want to research AI in education.",
        "I'm interested in social media and university students.",
        "I have a research idea but it feels too broad.",
      ],
      icon: Sparkles,
    },
    roast: {
      title: "Roast",
      headline: "Critical Scope & Flaw Analysis",
      emptyStateQuote:
        "Give me your research idea. I'll challenge it — respectfully.",
      suggestedPrompts: [
        "Roast my research idea.",
        "Is this research question too broad?",
        "Tell me what's weak about this topic.",
      ],
      icon: Flame,
    },
    funding: {
      title: "Get Funding",
      headline: "Funder Matching & Grant Discovery",
      emptyStateQuote:
        "Tell me about your research and I'll help you explore potential funding opportunities.",
      suggestedPrompts: [
        "Find potential funders for my education research.",
        "My research is about AI and healthcare in Africa.",
        "What organizations might support this research?",
      ],
      icon: Coins,
    },
  };

  const activeConfig = modeConfigs[currentMode];

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleModeChange = (newMode: ChatMode) => {
    openedFromQuery.current = null;
    setCurrentMode(newMode);
    router.replace("/chat", { scroll: false });
  };

  const handleSendMessage = React.useCallback(
    async (content: string): Promise<string | null> => sendMessage(content),
    [sendMessage]
  );

  // Only write URL when a brand-new chat gets a real id (null/temp → uuid).
  // Never overwrite ?c= while the user is switching history via the URL.
  React.useEffect(() => {
    const prev = prevActiveId.current;
    prevActiveId.current = activeId;

    if (!activeId || activeId.startsWith("temp-")) return;

    const wasNew = !prev || prev.startsWith("temp-");
    if (!wasNew) return;
    if (conversationId === activeId) return;

    openedFromQuery.current = activeId;
    router.replace(`/chat?c=${activeId}`, { scroll: false });
  }, [activeId, conversationId, router]);

  const voice = useVoicePipeline({
    mode: currentMode,
    conversationId: activeId?.startsWith("temp-") ? null : activeId,
    sendThroughChat: handleSendMessage,
    userId: user?.id,
    userEmail: user?.email,
  });

  React.useEffect(() => {
    if (!voice.isSessionOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        voice.disconnect();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [voice.isSessionOpen, voice.disconnect]);

  if (authLoading || !user) {
    return (
      <AppShell>
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-7xl mx-auto w-full">
        {errorBanner && (
          <div className="shrink-0 mt-3 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50/80 px-3.5 py-2.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <span className="truncate">{errorBanner}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="p-1 hover:text-red-950 dark:hover:text-white"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0 pt-4">
          <div className="lg:col-span-8 flex flex-col justify-between h-full min-h-0">
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-4">
              {isLoadingThread ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 my-auto">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                      <activeConfig.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                        {activeConfig.title} Mode
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                        ScholarXiv Pair-Researcher
                      </p>
                    </div>
                  </div>

                  <blockquote className="mt-5 border-l-2 border-zinc-300 dark:border-zinc-700 pl-4 py-1 text-sm font-medium text-zinc-800 dark:text-zinc-200 italic">
                    &ldquo;{activeConfig.emptyStateQuote}&rdquo;
                  </blockquote>

                  <div className="mt-6 space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Try one of these starting questions:
                    </span>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pt-1">
                      {activeConfig.suggestedPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            void handleSendMessage(prompt);
                          }}
                          disabled={isSending}
                          className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-700 hover:border-zinc-400 hover:bg-white text-left transition-all dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-2xs disabled:opacity-50"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      onSelectSource={setSelectedSource}
                      selectedSourceId={selectedSource?.id}
                      isFunderSaved={isFunderSaved}
                      isFunderSaving={isFunderSaving}
                      onToggleSaveFunder={(source) => {
                        void toggleSaveFunder(source);
                      }}
                    />
                  ))}
                  {isSending && (
                    <TypingIndicator mode={currentMode} notice={activity} />
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {voice.isSessionOpen && (
              <div className="pt-2 pb-1 shrink-0 flex flex-col items-center animate-fadeIn">
                <LiveVoiceOrb
                  phase={voice.phase}
                  getInputLevel={voice.getInputLevel}
                  getOutputLevel={voice.getOutputLevel}
                  transcript={voice.liveTranscript}
                  transcriptRole={voice.transcriptRole}
                  errorCode={voice.errorCode}
                  errorReason={voice.errorReason}
                  errorMessage={voice.errorMessage}
                  onReplaceKey={voice.replaceKey}
                  onRetry={() => {
                    void voice.connect();
                  }}
                  onClose={() => {
                    voice.disconnect();
                  }}
                />
              </div>
            )}

            <div className="pt-2 pb-1 shrink-0">
              <ChatInput
                currentMode={currentMode}
                onModeChange={handleModeChange}
                onSendMessage={(content) => {
                  void handleSendMessage(content);
                }}
                disabled={isSending || isLoadingThread}
                isLoading={isSending}
                voiceAvailable={voice.available}
                voicePhase={voice.phase}
                voiceActive={voice.isSessionOpen}
                voiceErrorCode={voice.errorCode}
                onToggleVoice={() => {
                  void voice.toggle();
                }}
                onInterruptVoice={voice.interrupt}
                onDisconnectVoice={voice.disconnect}
                onRetryVoice={() => {
                  void voice.connect();
                }}
                getInputLevel={voice.getInputLevel}
                getOutputLevel={voice.getOutputLevel}
              />
            </div>
          </div>

          {currentMode === "funding" ? (
            <div className="hidden lg:flex lg:col-span-4 flex-col h-full min-h-0">
              <SourceDetailsPanel
                source={selectedSource}
                mode={currentMode}
                onClose={() => setSelectedSource(null)}
                isSaved={selectedSource ? isFunderSaved(selectedSource) : false}
                isSaving={selectedSource ? isFunderSaving(selectedSource) : false}
                onToggleSave={(source) => {
                  void toggleSaveFunder(source);
                }}
              />
            </div>
          ) : (
            <div className="hidden lg:flex lg:col-span-4 flex-col space-y-4 h-full min-h-0">
              <Card className="flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-zinc-500" />
                    <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                      ScholarXiv Literature
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {sessionSources.length} grounded
                  </span>
                </div>

                <div className="p-4 text-xs space-y-3 overflow-y-auto flex-1">
                  {sessionSources.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800 text-zinc-400">
                      <p>
                        Papers retrieved from ScholarXiv during this conversation
                        will automatically appear here with links and summaries.
                      </p>
                    </div>
                  ) : (
                    sessionSources.map((source: ResearchSource) => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        compact
                        variant="paper"
                      />
                    ))
                  )}
                </div>
              </Card>

              <Card className="p-4 bg-zinc-50/80 dark:bg-zinc-900/40 shrink-0">
                <div className="flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Publish & Support Pipeline
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                      After funding analysis, you can choose to make your research
                      publicly discoverable and enable Buy Me a Coffee tips.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {currentMode === "funding" && selectedSource && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs lg:hidden animate-fadeIn"
            onClick={() => setSelectedSource(null)}
          >
            <div
              className="w-full max-w-lg max-h-[85vh] h-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <SourceDetailsPanel
                source={selectedSource}
                mode={currentMode}
                onClose={() => setSelectedSource(null)}
                isSaved={isFunderSaved(selectedSource)}
                isSaving={isFunderSaving(selectedSource)}
                onToggleSave={(source) => {
                  void toggleSaveFunder(source);
                }}
              />
            </div>
          </div>
        )}

        <PublishOfferModal
          open={publishOpen}
          conversationId={activeId?.startsWith("temp-") ? null : activeId}
          paperUrl={publishPaperUrl}
          onClose={() => {
            setPublishOpen(false);
            clearPublishOffer();
          }}
          onPublished={() => {
            clearPublishOffer();
          }}
        />

        <VoxideKeyReplacementModal
          open={voice.isCreditExpired}
          onClose={() => {
            voice.dismissCreditError();
          }}
          onReplaceKey={voice.replaceKey}
        />
      </div>
    </AppShell>
  );
}

export default function ChatPage() {
  return (
    <React.Suspense
      fallback={
        <AppShell>
          <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        </AppShell>
      }
    >
      <ChatPageInner />
    </React.Suspense>
  );
}

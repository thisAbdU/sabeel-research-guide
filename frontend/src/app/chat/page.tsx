"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Flame,
  Coins,
  BookOpen,
  Info,
  RotateCcw,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { SourceCard } from "@/components/chat/SourceCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChatMode, ChatMessageItem, ResearchSource } from "@/types/chat";
import { useAuth } from "@/context/AuthContext";
import { sendChatMessage, ChatApiError } from "@/services/chat";

export default function ChatPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [currentMode, setCurrentMode] = React.useState<ChatMode>("vent");
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessageItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [sessionSources, setSessionSources] = React.useState<ResearchSource[]>([]);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Redirect unauthenticated users to /login
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  // Mode Configuration and Empty State Text
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
      emptyStateQuote: "You have an idea. Let's figure out what you're actually trying to research.",
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
      emptyStateQuote: "Give me your research idea. I'll challenge it — respectfully.",
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
      emptyStateQuote: "Tell me about your research and I'll help you explore potential funding opportunities.",
      suggestedPrompts: [
        "Find potential funders for my education research.",
        "My research is about AI and healthcare in Africa.",
        "What organizations might support this research?",
      ],
      icon: Coins,
    },
  };

  const activeConfig = modeConfigs[currentMode];

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Mode switching: resets conversation state to maintain backend consistency
  const handleModeChange = (newMode: ChatMode) => {
    if (newMode === currentMode) return;
    setCurrentMode(newMode);
    setConversationId(null);
    setMessages([]);
    setSessionSources([]);
    setErrorBanner(null);
  };

  // Reset / New Session
  const handleClearChat = () => {
    setConversationId(null);
    setMessages([]);
    setSessionSources([]);
    setErrorBanner(null);
  };

  // Real backend chat submission
  const handleSendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    setErrorBanner(null);

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      createdAt: new Date(),
      mode: currentMode,
    };

    // Optimistically show user message immediately
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result = await sendChatMessage({
        mode: currentMode,
        conversationId,
        message: trimmed,
      });

      // Save returned conversation ID for subsequent turns
      if (result.conversationId) {
        setConversationId(result.conversationId);
      }

      // Add assistant response
      const assistantMsg: ChatMessageItem = {
        id: result.message.id || `asst-${Date.now()}`,
        role: "assistant",
        content: result.message.content,
        createdAt: result.message.createdAt || new Date().toISOString(),
        mode: currentMode,
        sources: result.sources && result.sources.length > 0 ? result.sources : undefined,
        researchDirections:
          result.researchDirections && result.researchDirections.length > 0
            ? result.researchDirections
            : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Deduplicate and accumulate ScholarXiv sources in right drawer
      if (result.sources && result.sources.length > 0) {
        setSessionSources((prev) => {
          const existingKeys = new Set(prev.map((s) => s.id || s.title));
          const newSources = result.sources.filter((s) => !existingKeys.has(s.id || s.title));
          return [...newSources, ...prev];
        });
      }
    } catch (err) {
      const errorMessage =
        err instanceof ChatApiError
          ? err.message
          : "Something went wrong while processing your research request. Please try again.";

      const errorMsg: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: errorMessage,
        createdAt: new Date(),
        mode: currentMode,
        isError: true,
      };

      setMessages((prev) => [...prev, errorMsg]);
      setErrorBanner(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
        {/* Top Header: Title, Mode Indicator, and Session Actions */}
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl dark:text-zinc-50">
                Research Assistant
              </h1>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-mono">
                {activeConfig.title} Mode
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {activeConfig.headline} — Voice & Literature Grounded
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="h-8 text-xs gap-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 rounded-lg"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>New Session</span>
              </Button>
            )}
          </div>
        </div>

        {/* Global Error Banner (if error occurred) */}
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

        {/* Workspace: Left Chat Stream + Right Grounding Panel */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0 pt-4">
          {/* Main Chat Stream Column */}
          <div className="lg:col-span-8 flex flex-col justify-between h-full min-h-0">
            {/* Scrollable Message Flow Area */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-4">
              {messages.length === 0 ? (
                /* Mode-Specific Empty State Canvas */
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
                          onClick={() => handleSendMessage(prompt)}
                          disabled={isLoading}
                          className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-700 hover:border-zinc-400 hover:bg-white text-left transition-all dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-2xs disabled:opacity-50"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Active Message Stream */
                <>
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}

                  {/* Mode-Specific Typing / Loading Indicator */}
                  {isLoading && <TypingIndicator mode={currentMode} />}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Area with Integrated Mode Switching */}
            <div className="pt-2 pb-1 shrink-0">
              <ChatInput
                currentMode={currentMode}
                onModeChange={handleModeChange}
                onSendMessage={handleSendMessage}
                disabled={isLoading}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Right Panel: ScholarXiv Grounding & Literature References */}
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
                  {sessionSources.length} Grounded
                </span>
              </div>

              <div className="p-4 text-xs space-y-3 overflow-y-auto flex-1">
                {sessionSources.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-800 text-zinc-400">
                    <p>
                      Papers retrieved from ScholarXiv during this conversation will automatically appear here with links and summaries.
                    </p>
                  </div>
                ) : (
                  sessionSources.map((source) => (
                    <SourceCard key={source.id} source={source} compact />
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
                    After funding analysis, you can choose to make your research publicly discoverable and enable Buy Me a Coffee tips.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

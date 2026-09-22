"use client";

import * as React from "react";
import {
  Sparkles,
  Flame,
  Coins,
  BookOpen,
  Info,
  RotateCcw,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { SourceCard } from "@/components/chat/SourceCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChatMode, ChatMessageItem, ResearchSource } from "@/types/chat";

export default function ChatPage() {
  const [currentMode, setCurrentMode] = React.useState<ChatMode>("vent");
  const [messages, setMessages] = React.useState<ChatMessageItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [sessionSources, setSessionSources] = React.useState<ResearchSource[]>([]);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Mode Configuration and Empty State Text
  const modeConfigs: Record<
    ChatMode,
    {
      title: string;
      headline: string;
      emptyStateQuote: string;
      suggestedPrompts: string[];
      icon: any;
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

  // Mock responses for Day 2 verification
  const handleSendMessage = (content: string) => {
    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date(),
      mode: currentMode,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Simulate mock assistant reply based on active mode
    setTimeout(() => {
      let mockReply: ChatMessageItem;

      if (currentMode === "vent") {
        const source1: ResearchSource = {
          id: `src-${Date.now()}-1`,
          title: "Adaptive Learning Interventions and Educational Disparities in Sub-Saharan Africa",
          authors: ["E. Kidane", "A. Worku", "T. Girmay"],
          summary:
            "A longitudinal study evaluating the integration of generative AI tutoring systems across Ethiopian STEM university departments, identifying distinct variable outcomes in low-bandwidth settings.",
          url: "https://arxiv.org",
          source: "ScholarXiv / cs.AI",
          year: "2024",
        };

        mockReply = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content:
            "That's a fertile area of research. To convert this from a general topic into a focused, publishable investigation, we should narrow your scope across three key dimensions:\n\n1. Target Cohort: Are you looking at undergraduate students, secondary school teachers, or administrative curriculum designers?\n\n2. Key Variables: Are you studying cognitive retention, study habit disruptions, or software interaction metrics?\n\n3. Regional Context: Situate your investigation in a specific geographic or institutional context (e.g. Jimma University or Addis Ababa).",
          createdAt: new Date(),
          mode: "vent",
          sources: [source1],
          researchDirections: [
            "Impact of LLM tutoring on first-year computer science retention in Ethiopian public universities.",
            "Teacher attitudes toward automated grading models in resource-constrained secondary schools.",
            "Evaluating mobile smartphone usage policies and digital divide factors in rural universities.",
          ],
        };

        setSessionSources((prev) => [source1, ...prev]);
      } else if (currentMode === "roast") {
        const source2: ResearchSource = {
          id: `src-${Date.now()}-2`,
          title: "Methodological Ambiguities in Social Media Usage and Academic Performance Literature",
          authors: ["D. Chen", "M. Bekele"],
          summary:
            "A meta-analysis exposing common empirical flaws in educational social media studies, notably undefined exposure variables and lack of longitudinal cohort control.",
          url: "https://arxiv.org",
          source: "ScholarXiv / soc.QA",
          year: "2025",
        };

        mockReply = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content:
            "Let's break down the critical vulnerabilities in this proposal before a thesis committee does:\n\n1. Ambiguous Variable: 'Social media' is too broad. Passive TikTok consumption is fundamentally different from active peer study groups on Telegram.\n\n2. Unmeasurable Scope: 'Students' without an age, field of study, or institutional bracket makes meaningful cohort comparison impossible.\n\n3. Better Alternative: A defensible formulation would be: 'The correlational relationship between short-form video consumption and sleep latency among undergraduate engineering students at Jimma University.'",
          createdAt: new Date(),
          mode: "roast",
          sources: [source2],
          researchDirections: [
            "Narrow the independent variable to a single platform or behavioral frequency metric.",
            "Define explicit quantitative measurement scales (e.g. Pittsburgh Sleep Quality Index).",
          ],
        };

        setSessionSources((prev) => [source2, ...prev]);
      } else {
        mockReply = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content:
            "Based on your research focus, I have identified potential matching programs and institutional funders whose active grant priorities overlap with your study parameters:\n\n1. African Development Bank (AfDB) - Higher Education Science and Technology Fund.\n2. Mastercard Foundation - Scholars Program Research Innovation Grants.\n3. International Development Research Centre (IDRC) - Artificial Intelligence for Development (AI4D) Africa initiative.\n\nNote: These are potential matches, not guaranteed awards. You are encouraged to review the official calls and guidelines directly.",
          createdAt: new Date(),
          mode: "funding",
          researchDirections: [
            "Align methodology sections with AfDB priority indicators on youth tech employment.",
            "Include explicit regional capacity-building metrics for IDRC grant requirements.",
          ],
        };
      }

      setMessages((prev) => [...prev, mockReply]);
      setIsLoading(false);
    }, 900);
  };

  // Helper to trigger simulated error state for review
  const handleSimulateError = () => {
    const errorMsg: ChatMessageItem = {
      id: `err-${Date.now()}`,
      role: "assistant",
      content:
        "ScholarXiv literature retrieval service is temporarily unreachable. Please check your network connection or try a broader query.",
      createdAt: new Date(),
      mode: currentMode,
      isError: true,
    };
    setMessages((prev) => [...prev, errorMsg]);
  };

  const handleClearChat = () => {
    setMessages([]);
    setSessionSources([]);
  };

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

            <Button
              variant="outline"
              size="sm"
              onClick={handleSimulateError}
              title="Test error state placeholder"
              className="h-8 text-xs text-zinc-400 hover:text-zinc-700 rounded-lg"
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Test Error State
            </Button>
          </div>
        </div>

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
                          className="rounded-lg border border-zinc-200/90 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-700 hover:border-zinc-400 hover:bg-white text-left transition-all dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-2xs"
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

                  {/* Typing / Loading Indicator */}
                  {isLoading && <TypingIndicator mode={currentMode} />}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Area with Integrated Mode Switching */}
            <div className="pt-2 pb-1 shrink-0">
              <ChatInput
                currentMode={currentMode}
                onModeChange={(mode) => setCurrentMode(mode)}
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

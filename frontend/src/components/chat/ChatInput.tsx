"use client";

import * as React from "react";
import {
  Send,
  Mic,
  MicOff,
  Plus,
  Sparkles,
  Flame,
  Coins,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChatMode } from "@/types/chat";
import { ModeSelector } from "./ModeSelector";
import type { VoicePhase } from "@/hooks/useVoicePipeline";

interface ChatInputProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  onSendMessage: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  voiceAvailable?: boolean;
  voicePhase?: VoicePhase;
  voiceActive?: boolean;
  voiceErrorCode?: string | null;
  onToggleVoice?: () => void;
  onInterruptVoice?: () => void;
  onDisconnectVoice?: () => void;
  onRetryVoice?: () => void;
  getInputLevel?: () => number;
  getOutputLevel?: () => number;
}

export function ChatInput({
  currentMode,
  onModeChange,
  onSendMessage,
  placeholder,
  disabled = false,
  isLoading = false,
  voiceAvailable = false,
  voicePhase = "ready",
  voiceActive = false,
  voiceErrorCode,
  onToggleVoice,
  onInterruptVoice,
  onDisconnectVoice,
  onRetryVoice,
  getInputLevel,
  getOutputLevel,
}: ChatInputProps) {
  const [text, setText] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const voiceInputRef = React.useRef<HTMLInputElement>(null);

  const defaultPlaceholders: Record<ChatMode, string> = {
    vent: "Share a research interest, field, or topic you're exploring...",
    roast: "Paste your working research question or idea to challenge...",
    funding: "Describe your research problem or abstract to find potential funders...",
  };

  const currentPlaceholder = placeholder || defaultPlaceholders[currentMode];

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        160
      )}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled || isLoading) return;

    onSendMessage(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // -------------------------------------------------------------
  // ChatGPT-Style Live Voice Pill Bar
  // -------------------------------------------------------------
  if (voiceActive) {
    return (
      <div className="w-full">
        <div className="relative flex items-center w-full rounded-full border border-zinc-300/80 bg-white/95 dark:border-zinc-700/80 dark:bg-zinc-900/95 px-3 py-1.5 sm:px-4 sm:py-2 shadow-lg backdrop-blur-md transition-all focus-within:border-zinc-600 focus-within:ring-2 focus-within:ring-zinc-900/10 dark:focus-within:ring-zinc-100/10">
          {/* Left Action Button */}
          <button
            type="button"
            onClick={() => voiceInputRef.current?.focus()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            title="Type a message in voice mode"
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Centered Type Input */}
          <input
            ref={voiceInputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            placeholder="Type"
            className="flex-1 bg-transparent px-2.5 py-1 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 min-w-0"
          />

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live Connection Status Dot */}
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                voiceErrorCode
                  ? "bg-red-500 animate-pulse"
                  : "bg-emerald-500 animate-pulse"
              }`}
              title={
                voiceErrorCode
                  ? `Voice status: ${voiceErrorCode}`
                  : "Live Voice connected"
              }
            />

            {/* Mode Indicator Icon */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 dark:text-zinc-500"
              title={`${currentMode.toUpperCase()} mode active`}
            >
              {currentMode === "roast" ? (
                <Flame className="h-4 w-4 text-amber-500" />
              ) : currentMode === "funding" ? (
                <Coins className="h-4 w-4 text-emerald-500" />
              ) : (
                <Sparkles className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              )}
            </div>

            {/* Mic / Interrupt Control */}
            <button
              type="button"
              onClick={voicePhase === "responding" ? onInterruptVoice : onToggleVoice}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title={
                voicePhase === "responding"
                  ? "Stop assistant speaking (Interrupt)"
                  : "Microphone active"
              }
            >
              {voicePhase === "responding" ? (
                <Square className="h-3.5 w-3.5 fill-current text-zinc-900 dark:text-zinc-100" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            {/* Circular Exit Voice Button: Dark circle with white X */}
            <button
              type="button"
              onClick={onDisconnectVoice}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-90 transition-transform active:scale-95 shadow-xs cursor-pointer"
              title="Exit Voice Mode"
              aria-label="Exit Voice Mode"
            >
              <X className="h-4 w-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        <p className="mt-1.5 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
          Live Voice active · Tap X to return to text input · ScholarXiv stays literature-grounded
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Standard Text Chat Input
  // -------------------------------------------------------------
  return (
    <div className="w-full">
      <div className="rounded-2xl border border-zinc-300/90 bg-white p-2.5 shadow-xs transition-all focus-within:border-zinc-700 focus-within:ring-2 focus-within:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-zinc-400">
        <div className="flex items-center justify-between px-1 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <ModeSelector
            currentMode={currentMode}
            onModeChange={onModeChange}
            variant="minimal"
            disabled={disabled || isLoading}
          />

          <span className="text-[11px] text-zinc-400 hidden sm:inline font-mono">
            {currentMode === "vent"
              ? "Ideation & Guidance"
              : currentMode === "roast"
              ? "Critical Evaluation"
              : "Institutional Matching"}
          </span>
        </div>

        <div className="pt-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            placeholder={currentPlaceholder}
            className="w-full resize-none bg-transparent px-2 py-1 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 max-h-40 leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              title={
                !voiceAvailable
                  ? "Set VOXIDE_PUBLIC_KEY to enable voice"
                  : "Start live voice conversation"
              }
              disabled={!voiceAvailable || disabled}
              onClick={onToggleVoice}
              aria-pressed={voiceActive}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Mic className="h-4 w-4" />
            </button>
            {voiceAvailable && (
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                Live Voice
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 hidden sm:inline">
              Enter to send, Shift + Enter for newline
            </span>

            <Button
              type="button"
              onClick={() => handleSubmit()}
              size="sm"
              disabled={!text.trim() || disabled || isLoading}
              className="h-8 px-3.5 gap-1.5 rounded-lg shrink-0"
            >
              <span>Send</span>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-1.5 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
        Prefer typing? Use text instead. ScholarXiv Companion stays literature-grounded either way.
      </p>
    </div>
  );
}

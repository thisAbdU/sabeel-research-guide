"use client";

import * as React from "react";
import { Send, Mic } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChatMode } from "@/types/chat";
import { ModeSelector } from "./ModeSelector";

interface ChatInputProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  onSendMessage: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ChatInput({
  currentMode,
  onModeChange,
  onSendMessage,
  placeholder,
  disabled = false,
  isLoading = false,
}: ChatInputProps) {
  const [text, setText] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const defaultPlaceholders: Record<ChatMode, string> = {
    vent: "Share a research interest, field, or topic you're exploring...",
    roast: "Paste your working research question or idea to challenge...",
    funding: "Describe your research problem or abstract to find potential funders...",
  };

  const currentPlaceholder = placeholder || defaultPlaceholders[currentMode];

  // Auto-resize textarea height
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-zinc-300/90 bg-white p-2.5 shadow-xs transition-all focus-within:border-zinc-700 focus-within:ring-2 focus-within:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-zinc-400">
        {/* Top row inside input: Mode Switcher & Mode Context Note */}
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

        {/* Middle row: Text Entry Area */}
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

        {/* Bottom row: Voice Placeholder & Send Button */}
        <div className="flex items-center justify-between pt-1 px-1">
          {/* Voxide Mic Button Placeholder */}
          <button
            type="button"
            title="Voice input (Voxide integration)"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <Mic className="h-4 w-4" />
          </button>

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
        ScholarXiv Companion integrates directly with academic literature for evidence-based research guidance.
      </p>
    </div>
  );
}

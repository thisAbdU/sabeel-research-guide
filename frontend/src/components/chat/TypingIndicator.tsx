"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { ChatMode } from "@/types/chat";

interface TypingIndicatorProps {
  mode?: ChatMode;
}

export function TypingIndicator({ mode = "vent" }: TypingIndicatorProps) {
  const modeLabels: Record<ChatMode, string> = {
    vent: "Synthesizing research directions...",
    roast: "Critiquing variables and methodology...",
    funding: "Matching potential funding programs...",
  };

  return (
    <div className="flex items-start gap-3 text-xs text-zinc-500 animate-fadeIn">
      {/* Assistant Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900">
        <Sparkles className="h-4 w-4 animate-spin-slow" />
      </div>

      {/* Typing Bubble */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" />
          </div>
          <span className="text-zinc-500 dark:text-zinc-400 text-[11px] font-medium">
            {modeLabels[mode]}
          </span>
        </div>
      </div>
    </div>
  );
}

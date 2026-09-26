"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { ChatMode } from "@/types/chat";

interface TypingIndicatorProps {
  mode?: ChatMode;
  notice?: string | null;
}

const FUNDING_STEPS = [
  "Thinking",
  "Pondering the research",
  "Finding funding sources",
  "Looking through foundations",
  "Comparing potential matches",
];

export function TypingIndicator({ mode = "vent", notice }: TypingIndicatorProps) {
  const modeLabels: Record<ChatMode, string> = {
    vent: "Synthesizing research directions...",
    roast: "Examining your research idea...",
    funding: FUNDING_STEPS[0],
  };
  const [steps, setSteps] = React.useState<string[]>(
    mode === "funding" ? [FUNDING_STEPS[0]] : []
  );
  const stepIndex = React.useRef(0);
  const serverTookOver = React.useRef(false);

  React.useEffect(() => {
    if (mode !== "funding") return;
    const id = window.setInterval(() => {
      if (serverTookOver.current) return;
      stepIndex.current += 1;
      const next = FUNDING_STEPS[stepIndex.current];
      if (!next) return;
      setSteps((prev) => (prev.includes(next) ? prev : [...prev, next]));
    }, 3500);
    return () => window.clearInterval(id);
  }, [mode]);

  React.useEffect(() => {
    if (!notice) return;
    serverTookOver.current = true;
    setSteps((prev) => (prev[prev.length - 1] === notice ? prev : [...prev, notice]));
  }, [notice]);

  const visible = mode === "funding" ? steps : [modeLabels[mode]];
  const current = visible[visible.length - 1];
  const earlier = visible.slice(0, -1);

  return (
    <div className="flex items-start gap-3 text-xs text-zinc-500 animate-fadeIn">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900">
        <Sparkles className="h-4 w-4 animate-spin-slow" />
      </div>

      <div className="rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-1.5 min-w-52">
        {earlier.map((step) => (
          <p key={step} className="text-[11px] text-zinc-400 dark:text-zinc-500">
            {step}
          </p>
        ))}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" />
          </div>
          <span className="text-zinc-600 dark:text-zinc-300 text-[11px] font-medium">
            {current}
          </span>
        </div>
      </div>
    </div>
  );
}

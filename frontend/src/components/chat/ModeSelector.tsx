"use client";

import * as React from "react";
import { Sparkles, Flame, Coins } from "lucide-react";
import { ChatMode } from "@/types/chat";

interface ModeSelectorProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  variant?: "segmented" | "minimal";
  disabled?: boolean;
}

export function ModeSelector({
  currentMode,
  onModeChange,
  variant = "segmented",
  disabled = false,
}: ModeSelectorProps) {
  const modes: { id: ChatMode; label: string; icon: any }[] = [
    { id: "vent", label: "Vent", icon: Sparkles },
    { id: "roast", label: "Roast", icon: Flame },
    { id: "funding", label: "Get Funding", icon: Coins },
  ];

  if (variant === "minimal") {
    return (
      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs">
        {modes.map((m) => {
          const isActive = currentMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => onModeChange(m.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? "bg-white text-zinc-950 font-semibold shadow-2xs dark:bg-zinc-700 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <m.icon className="h-3 w-3 shrink-0 text-zinc-500 dark:text-zinc-400" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50/80 p-1 dark:border-zinc-800 dark:bg-zinc-900">
      {modes.map((m) => {
        const isActive = currentMode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            disabled={disabled}
            onClick={() => onModeChange(m.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? "bg-white text-zinc-900 font-semibold shadow-xs dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/60 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
            }`}
          >
            <m.icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

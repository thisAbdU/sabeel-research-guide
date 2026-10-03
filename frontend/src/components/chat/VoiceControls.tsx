"use client";

import * as React from "react";
import { Square, RotateCcw, X } from "lucide-react";
import type { VoicePhase } from "@/hooks/useVoicePipeline";

interface VoiceControlsProps {
  phase: VoicePhase;
  onInterrupt?: () => void;
  onDisconnect?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function VoiceControls({
  phase,
  onInterrupt,
  onDisconnect,
  onRetry,
  className = "",
}: VoiceControlsProps) {
  return (
    <div className={`flex items-center gap-1.5 shrink-0 ${className}`}>
      {/* Active assistant speech interruption */}
      {phase === "responding" && onInterrupt && (
        <button
          type="button"
          onClick={onInterrupt}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-400"
          title="Stop assistant speaking (keep session active)"
          aria-label="Stop speaking"
        >
          <Square className="h-2.5 w-2.5 fill-current" />
          <span>Stop Speaking</span>
        </button>
      )}

      {/* Reconnect retry action on error */}
      {phase === "error" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-400"
          title="Retry voice connection"
          aria-label="Retry connection"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Retry</span>
        </button>
      )}

      {/* End voice session */}
      {onDisconnect && (
        <button
          type="button"
          onClick={onDisconnect}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-400"
          title="End voice session"
          aria-label="End voice session"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { Mic, Volume2, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import type { VoicePhase } from "@/hooks/useVoicePipeline";
import { VoiceVisualizer } from "./VoiceVisualizer";
import { VoiceControls } from "./VoiceControls";

interface VoiceStatusBarProps {
  phase: VoicePhase;
  errorCode?: string | null;
  getInputLevel?: () => number;
  getOutputLevel?: () => number;
  onInterrupt?: () => void;
  onDisconnect?: () => void;
  onRetry?: () => void;
  className?: string;
}

function resolveErrorMessage(errorCode?: string | null): string {
  if (!errorCode) return "Voice connection encountered an unexpected issue.";
  const lower = errorCode.toLowerCase();
  if (
    lower.includes("denied") ||
    lower.includes("notallowed") ||
    lower.includes("permission")
  ) {
    return "Microphone access blocked. Please allow microphone permissions in your browser.";
  }
  if (lower.includes("device") || lower.includes("notfound")) {
    return "No microphone found. Please connect an audio input device.";
  }
  if (
    lower.includes("network") ||
    lower.includes("connect") ||
    lower.includes("ws") ||
    lower.includes("failed")
  ) {
    return "Voice session connection failed. Please check your network and retry.";
  }
  return `Voice error (${errorCode}). Tap retry to reconnect.`;
}

const PHASE_CONFIG: Record<
  Exclude<VoicePhase, "error">,
  { label: string; hint: string }
> = {
  ready: {
    label: "Voice ready",
    hint: "Start speaking whenever you're ready",
  },
  listening: {
    label: "Listening…",
    hint: "Share your research question or feedback",
  },
  processing: {
    label: "Processing…",
    hint: "Transcribing your research speech",
  },
  thinking: {
    label: "Thinking…",
    hint: "Synthesizing literature and reasoning",
  },
  responding: {
    label: "Speaking…",
    hint: "Hands-free voice response active",
  },
};

export function VoiceStatusBar({
  phase,
  errorCode,
  getInputLevel,
  getOutputLevel,
  onInterrupt,
  onDisconnect,
  onRetry,
  className = "",
}: VoiceStatusBarProps) {
  const isError = phase === "error";
  const errorMessage = isError ? resolveErrorMessage(errorCode) : null;
  const config = !isError ? PHASE_CONFIG[phase] : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full rounded-xl border border-zinc-200/90 bg-white/95 px-3 py-2 shadow-2xs backdrop-blur-xs transition-all dark:border-zinc-800 dark:bg-zinc-900/95 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Status Icon and Labels */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
            {phase === "listening" ? (
              <Mic className="h-3.5 w-3.5 animate-pulse text-zinc-900 dark:text-zinc-100" />
            ) : phase === "responding" ? (
              <Volume2 className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
            ) : phase === "processing" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-700 dark:text-zinc-300" />
            ) : phase === "thinking" ? (
              <Sparkles className="h-3.5 w-3.5 animate-spin-slow text-zinc-700 dark:text-zinc-300" />
            ) : isError ? (
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            ) : (
              <Mic className="h-3.5 w-3.5 text-zinc-500" />
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {isError ? "Voice error" : config?.label}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 shrink-0">
                Hands-free
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-xs sm:max-w-md">
              {isError ? errorMessage : config?.hint}
            </p>
          </div>
        </div>

        {/* Center: Audio Waveform Visualizer */}
        <div className="hidden sm:flex items-center justify-center px-2">
          <VoiceVisualizer
            phase={phase}
            getInputLevel={getInputLevel}
            getOutputLevel={getOutputLevel}
          />
        </div>

        {/* Right: Voice Controls (Stop Speaking / Retry / End Voice) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="sm:hidden flex items-center">
            <VoiceVisualizer
              phase={phase}
              getInputLevel={getInputLevel}
              getOutputLevel={getOutputLevel}
            />
          </div>
          <VoiceControls
            phase={phase}
            onInterrupt={onInterrupt}
            onDisconnect={onDisconnect}
            onRetry={onRetry}
          />
        </div>
      </div>
    </div>
  );
}

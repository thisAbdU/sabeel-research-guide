"use client";

import * as React from "react";
import { ArrowLeft, Square, RotateCcw, X } from "lucide-react";
import type { VoicePhase, VoiceErrorReason } from "@/hooks/useVoicePipeline";
import type { ChatMode } from "@/types/chat";
import { LiveVoiceOrb } from "./LiveVoiceOrb";

interface LiveVoiceModeProps {
  phase: VoicePhase;
  errorCode?: string | null;
  errorReason?: VoiceErrorReason | null;
  errorMessage?: string | null;
  mode: ChatMode;
  modeTitle?: string;
  getInputLevel?: () => number;
  getOutputLevel?: () => number;
  onInterrupt: () => void;
  onExit: () => void;
  onRetry: () => void;
  onReplaceKey?: (newKey: string) => Promise<{ success: boolean; error?: string }>;
}

function resolveErrorMessage(
  errorCode?: string | null,
  errorReason?: VoiceErrorReason | null
): { title: string; hint: string } {
  if (
    errorReason === "credits_expired" ||
    errorCode === "usage_limit" ||
    Boolean(errorCode && errorCode.toLowerCase().includes("limit"))
  ) {
    return {
      title: "Voice credits have expired",
      hint: "Your Voxide voice credits are no longer available. Create a new Voxide API key and paste it below to continue using live voice.",
    };
  }
  if (
    errorReason === "microphone_permission" ||
    (errorCode &&
      (errorCode.toLowerCase().includes("denied") ||
        errorCode.toLowerCase().includes("notallowed") ||
        errorCode.toLowerCase().includes("permission")))
  ) {
    return {
      title: "Microphone access blocked",
      hint: "Allow microphone permissions in your browser settings to continue the voice conversation.",
    };
  }
  if (
    errorReason === "microphone_not_found" ||
    (errorCode &&
      (errorCode.toLowerCase().includes("device") ||
        errorCode.toLowerCase().includes("notfound")))
  ) {
    return {
      title: "Microphone not found",
      hint: "No audio input device detected. Please connect a microphone and retry.",
    };
  }
  if (errorReason === "network") {
    return {
      title: "Network connection issue",
      hint: "Could not maintain live connection to the voice server. Please check your internet connection and retry.",
    };
  }
  return {
    title: "Voice connection issue",
    hint: "The voice session encountered an unexpected issue. Please retry.",
  };
}

const PHASE_LABELS: Record<
  Exclude<VoicePhase, "error">,
  { title: string; hint: string }
> = {
  ready: {
    title: "Voice Ready",
    hint: "Speak freely whenever you are ready",
  },
  listening: {
    title: "Listening…",
    hint: "Speak your research question or idea naturally",
  },
  processing: {
    title: "Processing…",
    hint: "Transcribing your research speech",
  },
  thinking: {
    title: "Thinking…",
    hint: "Synthesizing literature and reasoning",
  },
  responding: {
    title: "Speaking…",
    hint: "Assistant is replying aloud (tap Stop Speaking to interrupt)",
  },
};

export function LiveVoiceMode({
  phase,
  errorCode,
  errorReason,
  errorMessage,
  mode,
  modeTitle,
  getInputLevel,
  getOutputLevel,
  onInterrupt,
  onExit,
  onRetry,
  onReplaceKey,
}: LiveVoiceModeProps) {
  // Listen for Escape key to exit cleanly
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onExit]);

  const isCreditExpired =
    errorReason === "credits_expired" ||
    errorCode === "usage_limit" ||
    Boolean(errorCode && errorCode.toLowerCase().includes("limit"));
  const isError = phase === "error" || isCreditExpired;
  const errorDetails = isError ? resolveErrorMessage(errorCode, errorReason) : null;
  const activeDetails = !isError ? PHASE_LABELS[phase] : null;

  const modeDisplayName =
    modeTitle ||
    (mode === "vent"
      ? "Vent Mode · Ideation"
      : mode === "roast"
      ? "Roast Mode · Critical Evaluation"
      : "Funding Mode · Institutional Matching");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Voice Conversation"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 bg-zinc-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="w-full h-full sm:h-[88vh] sm:max-h-[660px] sm:max-w-2xl sm:rounded-3xl border-0 sm:border border-zinc-200/80 bg-white/95 dark:border-zinc-800 dark:bg-zinc-900/95 shadow-2xl flex flex-col justify-between p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden transition-all">
        {/* Top Header: Exit, Mode Badge, Live Indicator */}
        <div className="flex items-center justify-between gap-4 shrink-0 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 cursor-pointer"
            aria-label="Exit voice mode"
            title="Exit voice mode (Esc)"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Exit Voice</span>
          </button>

          {/* Mode Context Badge */}
          <div className="flex flex-col items-center min-w-0">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              ScholarXiv Companion
            </span>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
              {modeDisplayName}
            </span>
          </div>

          {/* Live Voice Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[11px] font-mono shrink-0">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isCreditExpired ? "bg-zinc-400" : isError ? "bg-red-500" : "bg-emerald-500 animate-pulse"
              }`}
            />
            <span>{isCreditExpired ? "Credits Expired" : isError ? "Error" : "Live Voice"}</span>
          </div>
        </div>

        {/* Center Canvas: Live Acoustic Orb & Dynamic State Messaging */}
        <div className="flex-1 flex flex-col items-center justify-center py-6 sm:py-8 text-center min-h-0 overflow-y-auto">
          <LiveVoiceOrb
            phase={phase}
            getInputLevel={getInputLevel}
            getOutputLevel={getOutputLevel}
            errorCode={errorCode}
            errorReason={errorReason}
            errorMessage={errorMessage}
            onRetry={onRetry}
            onReplaceKey={onReplaceKey}
            onClose={onExit}
            className="mb-4"
          />

          {/* Human-Readable State Typography (when not showing replacement card) */}
          {!isCreditExpired && (
            <div className="space-y-1.5 max-w-md px-4">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                {isError ? errorDetails?.title : activeDetails?.title}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {isError ? errorDetails?.hint : activeDetails?.hint}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Control Hierarchy */}
        <div className="shrink-0 flex flex-col items-center gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center justify-center gap-3 w-full">
            {phase === "responding" && (
              <button
                type="button"
                onClick={onInterrupt}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-sm font-medium transition-all shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-400"
                aria-label="Stop assistant speaking"
                title="Interrupt speech (session remains open)"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Stop Speaking</span>
              </button>
            )}

            {isError && !isCreditExpired && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-sm font-medium transition-all shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-400"
                aria-label="Retry voice connection"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Retry Connection</span>
              </button>
            )}

            {phase === "listening" && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Microphone open — speak whenever ready</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
              aria-label="Exit voice mode"
            >
              <X className="h-3.5 w-3.5" />
              <span>Return to text chat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import type { VoicePhase, VoiceErrorReason } from "@/hooks/useVoicePipeline";
import { VoxideKeyReplacementCard } from "./VoxideKeyReplacementCard";

interface LiveVoiceOrbProps {
  phase: VoicePhase;
  getInputLevel?: () => number;
  getOutputLevel?: () => number;
  transcript?: string;
  transcriptRole?: "user" | "ai" | null;
  errorCode?: string | null;
  errorReason?: VoiceErrorReason | null;
  errorMessage?: string | null;
  onRetry?: () => void;
  onReplaceKey?: (newKey: string) => Promise<{ success: boolean; error?: string }>;
  onClose?: () => void;
  className?: string;
}

export function LiveVoiceOrb({
  phase,
  getInputLevel,
  getOutputLevel,
  transcript,
  transcriptRole = null,
  errorCode,
  errorReason,
  errorMessage,
  onRetry,
  onReplaceKey,
  onClose,
  className = "",
}: LiveVoiceOrbProps) {
  const outerGlowRef = React.useRef<HTMLDivElement>(null);
  const midAuraRef = React.useRef<HTMLDivElement>(null);
  const orbCoreRef = React.useRef<HTMLDivElement>(null);

  const animFrameRef = React.useRef<number | null>(null);
  const smoothedLevelRef = React.useRef<number>(0);

  const isAudioActive = phase === "listening" || phase === "responding";

  React.useEffect(() => {
    if (!isAudioActive) {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      smoothedLevelRef.current = 0;

      // Reset transforms gracefully
      if (orbCoreRef.current) orbCoreRef.current.style.transform = "scale(1)";
      if (midAuraRef.current) midAuraRef.current.style.transform = "scale(1)";
      if (outerGlowRef.current) outerGlowRef.current.style.transform = "scale(1)";
      return;
    }

    const updateFrame = () => {
      let rawLevel = 0;
      if (phase === "listening" && typeof getInputLevel === "function") {
        rawLevel = getInputLevel();
      } else if (phase === "responding" && typeof getOutputLevel === "function") {
        rawLevel = getOutputLevel();
      }

      // Clamp level between 0 and 1
      const clamped = Math.max(0, Math.min(1, Number.isFinite(rawLevel) ? rawLevel : 0));

      // Responsive exponential moving average
      smoothedLevelRef.current = smoothedLevelRef.current * 0.7 + clamped * 0.3;
      const current = smoothedLevelRef.current;

      const coreScale = 1 + current * 0.28;
      const auraScale = 1 + current * 0.45;
      const glowScale = 1 + current * 0.65;

      if (orbCoreRef.current) {
        orbCoreRef.current.style.transform = `scale(${coreScale.toFixed(3)})`;
      }
      if (midAuraRef.current) {
        midAuraRef.current.style.transform = `scale(${auraScale.toFixed(3)})`;
        midAuraRef.current.style.opacity = `${(0.35 + current * 0.55).toFixed(2)}`;
      }
      if (outerGlowRef.current) {
        outerGlowRef.current.style.transform = `scale(${glowScale.toFixed(3)})`;
        outerGlowRef.current.style.opacity = `${(0.2 + current * 0.6).toFixed(2)}`;
      }

      animFrameRef.current = requestAnimationFrame(updateFrame);
    };

    animFrameRef.current = requestAnimationFrame(updateFrame);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [phase, isAudioActive, getInputLevel, getOutputLevel]);

  const isThinking = phase === "thinking" || phase === "processing";
  const isCreditExpired =
    errorReason === "credits_expired" ||
    errorCode === "usage_limit" ||
    Boolean(errorCode && errorCode.toLowerCase().includes("limit"));
  const isError = phase === "error" || Boolean(errorCode) || Boolean(errorReason);

  // Status caption resolution
  const statusLabel = isCreditExpired
    ? "Voice credits expired"
    : errorReason === "microphone_permission"
    ? "Microphone access blocked"
    : errorReason === "microphone_not_found"
    ? "Microphone not detected"
    : errorReason === "network"
    ? "Network issue"
    : isError
    ? "Voice connection issue"
    : phase === "listening"
    ? "Listening…"
    : isThinking
    ? "Thinking…"
    : phase === "responding"
    ? "Speaking…"
    : "Voice connected";

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none py-2 w-full max-w-lg mx-auto ${className}`}
      aria-label="Live Voice Status"
    >
      {/* Orb Visualizer Frame */}
      <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 shrink-0">
        {/* Soft outer atmospheric glow halo */}
        <div
          ref={outerGlowRef}
          className={`absolute inset-0 rounded-full blur-xl transition-all duration-300 pointer-events-none ${
            isCreditExpired
              ? "bg-indigo-500/20 dark:bg-indigo-500/15"
              : isError
              ? "bg-red-500/25 dark:bg-red-500/20"
              : isThinking
              ? "bg-indigo-400/35 dark:bg-indigo-500/30 animate-pulse"
              : "bg-gradient-to-tr from-purple-600/35 via-indigo-500/30 to-blue-500/35 dark:from-purple-500/30 dark:via-indigo-500/25 dark:to-blue-500/30 opacity-60"
          }`}
        />

        {/* Middle acoustic aura ring */}
        <div
          ref={midAuraRef}
          className={`absolute inset-1.5 rounded-full transition-all duration-300 pointer-events-none ${
            isCreditExpired
              ? "border border-zinc-300/40 dark:border-zinc-700/50 bg-zinc-500/5 dark:bg-zinc-800/20"
              : isError
              ? "border border-red-400/30 bg-red-500/10"
              : isThinking
              ? "border border-indigo-400/40 bg-indigo-500/10 animate-ping [animation-duration:3s]"
              : "border border-purple-400/30 dark:border-indigo-400/30 bg-purple-500/10 dark:bg-indigo-950/30 opacity-60"
          }`}
        />

        {/* Central Orb: Animated luminous glass sparkle orb */}
        <div
          ref={orbCoreRef}
          className={`relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-2xl transition-all duration-300 select-none ${
            isThinking ? "animate-pulse" : ""
          }`}
        >
          {/* The high-res transparent orb asset */}
          <div className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center">
            <img
              src="/voice-orb.png"
              alt="Voice Interaction Orb"
              className={`w-full h-full object-contain pointer-events-none select-none transition-transform duration-300 ${
                phase === "listening" || phase === "responding" ? "scale-105" : "scale-100"
              }`}
            />

            {/* Specular shimmer overlay when audio is active or thinking */}
            <div
              className={`absolute inset-0 rounded-full bg-radial from-white/25 via-transparent to-transparent pointer-events-none transition-opacity duration-300 ${
                phase === "listening" || phase === "responding"
                  ? "opacity-100 animate-pulse"
                  : isThinking
                  ? "opacity-80 animate-pulse"
                  : isCreditExpired
                  ? "opacity-40"
                  : "opacity-20"
              }`}
            />
          </div>
        </div>
      </div>

      {/* When credit expired, present the full Key Replacement Card */}
      {isCreditExpired && onReplaceKey ? (
        <div className="w-full mt-3 animate-fadeIn px-2 sm:px-4">
          <VoxideKeyReplacementCard
            onReplaceKey={onReplaceKey}
            onSuccess={() => {
              onRetry?.();
            }}
            onDismiss={onClose}
          />
        </div>
      ) : (
        /* Dynamic Status Typography & Live Transcription for standard phases */
        <div className="mt-1.5 flex flex-col items-center text-center max-w-sm px-3">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
            {phase === "listening" && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            )}
            {statusLabel}
          </span>

          {/* Live captions: user while listening, assistant while TTS plays */}
          {transcript && (
            <p
              className={`mt-1.5 text-xs font-medium animate-fadeIn max-w-sm ${
                transcriptRole === "ai"
                  ? "text-zinc-700 dark:text-zinc-200 not-italic line-clamp-4 text-left"
                  : "text-zinc-800 dark:text-zinc-200 italic truncate max-w-xs"
              }`}
            >
              {transcriptRole === "ai" ? transcript : `\u201C${transcript}\u201D`}
            </p>
          )}

          {/* Standard Error Retry Affordance (for non-credit issues like network blips) */}
          {isError && !isCreditExpired && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Retry Connection</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

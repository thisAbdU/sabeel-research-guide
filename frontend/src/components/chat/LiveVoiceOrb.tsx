"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import type { VoicePhase } from "@/hooks/useVoicePipeline";

interface LiveVoiceOrbProps {
  phase: VoicePhase;
  getInputLevel?: () => number;
  getOutputLevel?: () => number;
  transcript?: string;
  errorCode?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function LiveVoiceOrb({
  phase,
  getInputLevel,
  getOutputLevel,
  transcript,
  errorCode,
  onRetry,
  className = "",
}: LiveVoiceOrbProps) {
  const outerGlowRef = React.useRef<HTMLDivElement>(null);
  const midAuraRef = React.useRef<HTMLDivElement>(null);
  const orbCoreRef = React.useRef<HTMLDivElement>(null);
  const waveBarsRef = React.useRef<(HTMLSpanElement | null)[]>([]);

  const animFrameRef = React.useRef<number | null>(null);
  const smoothedLevelRef = React.useRef<number>(0);

  React.useEffect(() => {
    const isAudioActive = phase === "listening" || phase === "responding";

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

      // Symmetrical amplitude bars
      const barWeights = [0.45, 0.75, 1.0, 0.75, 0.45];
      waveBarsRef.current.forEach((bar, idx) => {
        if (!bar) return;
        const weight = barWeights[idx] ?? 0.6;
        const barScale = Math.max(0.25, Math.min(1.0, 0.25 + current * 0.75 * weight));
        bar.style.transform = `scaleY(${barScale.toFixed(3)})`;
      });

      animFrameRef.current = requestAnimationFrame(updateFrame);
    };

    animFrameRef.current = requestAnimationFrame(updateFrame);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [phase, getInputLevel, getOutputLevel]);

  const isThinking = phase === "thinking" || phase === "processing";
  const isError = phase === "error" || Boolean(errorCode);
  const isLimit = errorCode === "usage_limit" || (errorCode && errorCode.toLowerCase().includes("limit"));

  // Status caption
  const statusLabel = isLimit
    ? "Voxide usage limit reached"
    : isError
    ? "Voice connection error"
    : phase === "listening"
    ? "Listening…"
    : isThinking
    ? "Thinking…"
    : phase === "responding"
    ? "Speaking…"
    : "Voice connected";

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none py-2 ${className}`}
      aria-label="Live Voice Status"
    >
      {/* Orb Visualizer Frame */}
      <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32">
        {/* Soft outer atmospheric glow halo */}
        <div
          ref={outerGlowRef}
          className={`absolute inset-0 rounded-full blur-xl transition-all duration-300 pointer-events-none ${
            isError
              ? "bg-red-500/25 dark:bg-red-500/20"
              : isThinking
              ? "bg-indigo-400/30 dark:bg-indigo-500/25 animate-pulse"
              : "bg-gradient-to-tr from-sky-400/30 via-indigo-400/30 to-purple-400/30 dark:from-sky-500/20 dark:via-indigo-500/20 dark:to-purple-500/20 opacity-40"
          }`}
        />

        {/* Middle acoustic aura ring */}
        <div
          ref={midAuraRef}
          className={`absolute inset-2 rounded-full transition-all duration-300 pointer-events-none ${
            isError
              ? "border border-red-400/30 bg-red-500/10"
              : isThinking
              ? "border border-indigo-400/40 bg-indigo-500/10 animate-ping [animation-duration:3s]"
              : "border border-sky-300/40 dark:border-indigo-400/30 bg-sky-200/20 dark:bg-indigo-950/40 opacity-50"
          }`}
        />

        {/* Central Orb: Fluid dreamy sphere matching the ChatGPT Voice inspiration */}
        <div
          ref={orbCoreRef}
          className={`relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-xl transition-all duration-300 overflow-hidden ${
            isError
              ? "bg-gradient-to-tr from-red-500 via-rose-600 to-amber-600 text-white shadow-red-500/20"
              : isThinking
              ? "bg-gradient-to-tr from-zinc-700 via-zinc-800 to-zinc-900 text-white dark:from-zinc-200 dark:via-zinc-300 dark:to-zinc-100 dark:text-zinc-900 shadow-indigo-500/20 animate-pulse"
              : "bg-gradient-to-tr from-sky-300 via-indigo-300 to-violet-300 dark:from-slate-700 dark:via-indigo-900 dark:to-slate-800 text-zinc-900 dark:text-white shadow-sky-500/20 border border-white/40 dark:border-white/10"
          }`}
        >
          {/* Inner cloud / fluid sheen overlay */}
          <div className="absolute inset-0 bg-radial from-white/40 via-transparent to-black/10 dark:from-white/20 dark:to-black/30 pointer-events-none" />

          {/* Thinking State: 3 Harmonious pulsing dots */}
          {isThinking ? (
            <div className="relative z-10 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-zinc-900 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-zinc-900 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-zinc-900 animate-bounce" />
            </div>
          ) : isError ? (
            <div className="relative z-10 flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                {isLimit ? "Limit" : "Offline"}
              </span>
            </div>
          ) : (
            /* Live Audio Waveform Bars */
            <div className="relative z-10 flex items-center gap-1 h-6 px-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  ref={(el) => {
                    waveBarsRef.current[i] = el;
                  }}
                  className={`w-1 h-5 rounded-full transition-transform duration-75 origin-center ${
                    phase === "ready"
                      ? "bg-zinc-600/40 dark:bg-zinc-400/40 scale-y-[0.3]"
                      : "bg-zinc-800 dark:bg-zinc-100"
                  }`}
                  style={{
                    transform:
                      phase === "listening" || phase === "responding"
                        ? "scaleY(0.25)"
                        : undefined,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Status Typography & Live Transcription */}
      <div className="mt-1.5 flex flex-col items-center text-center max-w-sm px-3">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
          {phase === "listening" && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
          )}
          {statusLabel}
        </span>

        {/* Live speech transcription feedback while speaking */}
        {transcript && (
          <p className="mt-1 text-xs text-zinc-800 dark:text-zinc-200 font-medium italic truncate max-w-xs animate-fadeIn">
            &ldquo;{transcript}&rdquo;
          </p>
        )}

        {/* Error Retry Affordance */}
        {isError && onRetry && (
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
    </div>
  );
}

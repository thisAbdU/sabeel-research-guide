"use client";

import * as React from "react";
import type { VoicePhase } from "@/hooks/useVoicePipeline";

interface LiveVoiceOrbProps {
  phase: VoicePhase;
  getInputLevel?: () => number;
  getOutputLevel?: () => number;
  className?: string;
}

export function LiveVoiceOrb({
  phase,
  getInputLevel,
  getOutputLevel,
  className = "",
}: LiveVoiceOrbProps) {
  const outerRingRef = React.useRef<HTMLDivElement>(null);
  const midRingRef = React.useRef<HTMLDivElement>(null);
  const coreRef = React.useRef<HTMLDivElement>(null);
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

      // Reset transforms
      if (coreRef.current) coreRef.current.style.transform = "scale(1)";
      if (midRingRef.current) midRingRef.current.style.transform = "scale(1)";
      if (outerRingRef.current) outerRingRef.current.style.transform = "scale(1)";
      return;
    }

    const updateFrame = () => {
      let rawLevel = 0;
      if (phase === "listening" && typeof getInputLevel === "function") {
        rawLevel = getInputLevel();
      } else if (phase === "responding" && typeof getOutputLevel === "function") {
        rawLevel = getOutputLevel();
      }

      // Clamp between 0 and 1
      const clamped = Math.max(0, Math.min(1, Number.isFinite(rawLevel) ? rawLevel : 0));

      // Exponential moving average for fluid responsiveness
      smoothedLevelRef.current = smoothedLevelRef.current * 0.72 + clamped * 0.28;
      const current = smoothedLevelRef.current;

      // Scale calculations
      const coreScale = 1 + current * 0.25;
      const midScale = 1 + current * 0.45;
      const outerScale = 1 + current * 0.65;

      if (coreRef.current) {
        coreRef.current.style.transform = `scale(${coreScale.toFixed(3)})`;
      }
      if (midRingRef.current) {
        midRingRef.current.style.transform = `scale(${midScale.toFixed(3)})`;
        midRingRef.current.style.opacity = `${(0.25 + current * 0.55).toFixed(2)}`;
      }
      if (outerRingRef.current) {
        outerRingRef.current.style.transform = `scale(${outerScale.toFixed(3)})`;
        outerRingRef.current.style.opacity = `${(0.15 + current * 0.45).toFixed(2)}`;
      }

      // Symmetrical amplitude bars inside the orb core
      const barWeights = [0.4, 0.7, 1.0, 0.7, 0.4];
      waveBarsRef.current.forEach((bar, idx) => {
        if (!bar) return;
        const weight = barWeights[idx] ?? 0.6;
        const barScale = Math.max(0.2, Math.min(1.0, 0.2 + current * 0.8 * weight));
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
  const isError = phase === "error";

  return (
    <div
      className={`relative flex items-center justify-center w-64 h-64 select-none ${className}`}
      aria-hidden="true"
    >
      {/* Outer ambient expansion ring */}
      <div
        ref={outerRingRef}
        className={`absolute inset-0 rounded-full border transition-opacity duration-300 pointer-events-none ${
          isError
            ? "border-red-500/20 opacity-30"
            : isThinking
            ? "border-zinc-400/25 dark:border-zinc-500/25 animate-ping [animation-duration:3s]"
            : "border-zinc-400/30 dark:border-zinc-600/30 opacity-20"
        }`}
      />

      {/* Middle acoustic aura ring */}
      <div
        ref={midRingRef}
        className={`absolute inset-6 rounded-full border transition-all duration-300 pointer-events-none ${
          isError
            ? "border-red-500/30 bg-red-500/5 opacity-40"
            : isThinking
            ? "border-zinc-400/30 dark:border-zinc-500/30 bg-zinc-200/10 dark:bg-zinc-800/20 animate-pulse [animation-duration:2.5s]"
            : "border-zinc-400/40 dark:border-zinc-600/40 bg-zinc-200/20 dark:bg-zinc-800/30 opacity-30"
        }`}
      />

      {/* Main central acoustic orb core */}
      <div
        ref={coreRef}
        className={`relative flex items-center justify-center w-36 h-36 rounded-full shadow-2xl transition-all duration-300 ${
          isError
            ? "bg-zinc-900 border border-red-500/40 text-red-400 dark:bg-zinc-950 shadow-red-500/10"
            : isThinking
            ? "bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border border-zinc-700 dark:border-zinc-300 shadow-zinc-900/20 dark:shadow-zinc-100/10 animate-pulse"
            : phase === "responding"
            ? "bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 border-2 border-zinc-700 dark:border-zinc-300 shadow-xl"
            : phase === "listening"
            ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-2 border-zinc-600 dark:border-zinc-300 shadow-2xl"
            : "bg-zinc-900 dark:bg-zinc-100 text-zinc-200 dark:text-zinc-800 border border-zinc-700 dark:border-zinc-300"
        }`}
      >
        {/* Thinking State: 3 Harmonious pulsing orbital dots */}
        {isThinking ? (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-600 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-600 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-600 animate-bounce" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-1 text-center px-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-red-400">Offline</span>
          </div>
        ) : (
          /* Live Audio Waveform Bars reacting in real-time */
          <div className="flex items-center gap-1.5 h-10 px-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                ref={(el) => {
                  waveBarsRef.current[i] = el;
                }}
                className={`w-1.5 h-8 rounded-full transition-transform duration-75 origin-center ${
                  phase === "ready"
                    ? "bg-zinc-500/40 dark:bg-zinc-400/40 scale-y-[0.25]"
                    : "bg-white dark:bg-zinc-950"
                }`}
                style={{
                  transform:
                    phase === "listening" || phase === "responding"
                      ? "scaleY(0.2)"
                      : undefined,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

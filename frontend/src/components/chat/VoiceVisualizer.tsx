"use client";

import * as React from "react";
import type { VoicePhase } from "@/hooks/useVoicePipeline";

interface VoiceVisualizerProps {
  phase: VoicePhase;
  getInputLevel?: () => number;
  getOutputLevel?: () => number;
  className?: string;
}

const BAR_WEIGHTS = [0.45, 0.75, 1.0, 0.75, 0.45];
const NUM_BARS = BAR_WEIGHTS.length;

export function VoiceVisualizer({
  phase,
  getInputLevel,
  getOutputLevel,
  className = "",
}: VoiceVisualizerProps) {
  const barRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const animFrameRef = React.useRef<number | null>(null);
  const smoothedLevelRef = React.useRef<number>(0);

  // Audio-reactive frame loop for listening & responding phases
  React.useEffect(() => {
    const isAudioActive = phase === "listening" || phase === "responding";

    if (!isAudioActive) {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      smoothedLevelRef.current = 0;
      return;
    }

    const updateFrame = () => {
      let rawLevel = 0;
      if (phase === "listening" && typeof getInputLevel === "function") {
        rawLevel = getInputLevel();
      } else if (phase === "responding" && typeof getOutputLevel === "function") {
        rawLevel = getOutputLevel();
      }

      // Clamp RMS level strictly to [0, 1]
      const clamped = Math.max(0, Math.min(1, Number.isFinite(rawLevel) ? rawLevel : 0));

      // Smooth decay & damping to avoid jitter
      smoothedLevelRef.current = smoothedLevelRef.current * 0.7 + clamped * 0.3;
      const current = smoothedLevelRef.current;

      // Update bar transforms directly in DOM to avoid React re-render overhead at 60fps
      barRefs.current.forEach((bar, i) => {
        if (!bar) return;
        const weight = BAR_WEIGHTS[i] ?? 0.6;
        const scale = Math.max(0.18, Math.min(1.0, 0.18 + current * 0.82 * weight));
        bar.style.transform = `scaleY(${scale.toFixed(3)})`;
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

  // For thinking & processing: subtle harmonic pulsating dots without simulated audio levels
  if (phase === "thinking" || phase === "processing") {
    return (
      <div
        className={`flex items-center gap-1.5 h-6 px-1 ${className}`}
        aria-hidden="true"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 dark:bg-zinc-300 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 dark:bg-zinc-300 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 dark:bg-zinc-300 animate-bounce" />
      </div>
    );
  }

  // Audio bars for listening, responding, ready, and error
  return (
    <div
      className={`flex items-center gap-1 h-6 px-1 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: NUM_BARS }).map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barRefs.current[i] = el;
          }}
          className={`w-1 h-5 rounded-full transition-transform duration-75 origin-center ${
            phase === "error"
              ? "bg-zinc-400/30 dark:bg-zinc-600/30"
              : phase === "ready"
              ? "bg-zinc-400/50 dark:bg-zinc-500/50"
              : "bg-zinc-900 dark:bg-zinc-100"
          }`}
          style={{
            transform:
              phase === "error"
                ? "scaleY(0.18)"
                : phase === "ready"
                ? "scaleY(0.25)"
                : "scaleY(0.18)",
          }}
        />
      ))}
    </div>
  );
}

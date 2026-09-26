"use client";

import * as React from "react";
import { ExternalLink, BookOpen, Coins } from "lucide-react";
import { ResearchSource } from "@/types/chat";

interface SourceCardProps {
  source: ResearchSource;
  compact?: boolean;
  variant?: "paper" | "funding";
}

export function SourceCard({ source, compact = false, variant = "paper" }: SourceCardProps) {
  const funding = variant === "funding";
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs transition-all hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-zinc-700 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            {funding ? (
              <Coins className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            ) : (
              <BookOpen className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            )}
            <span className="font-mono text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
              {funding ? "Potential funder" : source.source}
            </span>
            {source.year && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <span>{source.year}</span>
              </>
            )}
          </div>

          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Open link"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <h4 className="mt-2 text-xs font-semibold leading-snug line-clamp-2">
          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-900 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer"
            >
              {source.title}
            </a>
          ) : (
            <span className="text-zinc-900 dark:text-zinc-100">{source.title}</span>
          )}
        </h4>

        {source.authors && source.authors.length > 0 && (
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 italic truncate">
            {source.authors.join(", ")}
          </p>
        )}

        {source.summary && (
          <div className="mt-2 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-2">
            <p className={compact && !expanded ? "line-clamp-2" : ""}>
              {source.summary}
            </p>
            {compact && source.summary.length > 120 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-[10px] font-medium text-zinc-500 hover:underline cursor-pointer"
              >
                {expanded ? "Show less" : "Read summary"}
              </button>
            )}
          </div>
        )}
      </div>

      {source.url && (
        <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors"
          >
            <span>{funding ? "View fund source" : "View Paper"}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          {!funding && <span className="text-[10px] text-zinc-400">PDF / Abstract</span>}
        </div>
      )}
    </div>
  );
}

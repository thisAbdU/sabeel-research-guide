"use client";

import * as React from "react";
import { ExternalLink, BookOpen } from "lucide-react";
import { ResearchSource } from "@/types/chat";

interface SourceCardProps {
  source: ResearchSource;
  compact?: boolean;
}

export function SourceCard({ source, compact = false }: SourceCardProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/80 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <BookOpen className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <span className="font-mono text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
            {source.source}
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
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-0.5"
            title="Open in ScholarXiv"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <h4 className="mt-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
        {source.title}
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
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-[10px] font-medium text-zinc-500 hover:underline"
            >
              {expanded ? "Show less" : "Read summary"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { Bookmark, BookmarkCheck, ExternalLink, Loader2 } from "lucide-react";
import { ResearchSource } from "@/types/chat";

export interface SourceCardProps {
  source: ResearchSource;
  compact?: boolean;
  variant?: "paper" | "funding";
  isSelected?: boolean;
  onSelect?: (source: ResearchSource) => void;
  isSaved?: boolean;
  isSaving?: boolean;
  onToggleSave?: (source: ResearchSource) => void;
}

export function SourceCard({
  source,
  compact = false,
  variant = "paper",
  isSelected = false,
  onSelect,
  isSaved = false,
  isSaving = false,
  onToggleSave,
}: SourceCardProps) {
  const isFunding = variant === "funding" || source.source === "Exa" || !!source.whyMatch;

  return (
    <div
      onClick={() => {
        if (isFunding) {
          onSelect?.(source);
        }
      }}
      className={`group rounded-xl border p-3.5 transition-all text-left flex flex-col justify-between ${
        isFunding ? "cursor-pointer" : ""
      } ${
        isSelected
          ? "border-zinc-900 bg-zinc-50/80 shadow-xs dark:border-zinc-100 dark:bg-zinc-800/80 ring-1 ring-zinc-900 dark:ring-zinc-100"
          : "border-zinc-200/90 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:border-zinc-700 shadow-2xs"
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {isFunding ? "Potential Funder" : source.source || "ScholarXiv"}
          </span>
          <div className="flex items-center gap-1">
            {source.year && (
              <span className="font-mono text-[10px] text-zinc-400">{source.year}</span>
            )}
            {isFunding && onToggleSave && (
              <button
                type="button"
                disabled={isSaving}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(source);
                }}
                title={isSaved ? "Remove saved funder" : "Save funder"}
                aria-label={isSaved ? "Remove saved funder" : "Save funder"}
                className="p-1 rounded text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isSaved ? (
                  <BookmarkCheck className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        <h4 className="mt-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
          {source.url && !isFunding ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {source.title}
            </a>
          ) : (
            source.title
          )}
        </h4>

        {source.program && (
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
            {source.program}
          </p>
        )}

        {!source.program && source.authors && source.authors.length > 0 && (
          <p className="mt-1 text-[11px] text-zinc-500 italic truncate">
            {source.authors.join(", ")}
          </p>
        )}

        {!isFunding && source.summary && (
          <div className="mt-2 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg p-2">
            <p className={compact ? "line-clamp-2" : ""}>{source.summary}</p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
        {isFunding ? (
          <>
            <span className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
              <span>View details</span>
              <span aria-hidden="true">→</span>
            </span>

            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Open external link"
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </>
        ) : source.url ? (
          <>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300 transition-colors"
            >
              <span>View Paper</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-[10px] text-zinc-400">ScholarXiv</span>
          </>
        ) : (
          <span className="text-[10px] text-zinc-400">ScholarXiv</span>
        )}
      </div>
    </div>
  );
}

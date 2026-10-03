"use client";

import * as React from "react";
import { Bookmark, BookmarkCheck, ExternalLink, Globe, Loader2, X } from "lucide-react";
import { ResearchSource, ChatMode } from "@/types/chat";

function LinkedinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function TwitterXIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface SourceDetailsPanelProps {
  source: ResearchSource | null;
  mode?: ChatMode;
  onClose: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
  onToggleSave?: (source: ResearchSource) => void;
}

export function SourceDetailsPanel({
  source,
  mode = "vent",
  onClose,
  isSaved = false,
  isSaving = false,
  onToggleSave,
}: SourceDetailsPanelProps) {
  if (!source) {
    return (
      <div className="h-full rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 flex flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500">
        <p className="text-xs">
          Select &ldquo;View details&rdquo; on any card to view details here.
        </p>
      </div>
    );
  }

  const isFunding = mode === "funding" || source.source === "Exa" || !!source.whyMatch;
  const websiteUrl = source.socials?.website || source.url;
  const linkedinUrl =
    source.socials?.linkedin ||
    `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(source.title)}`;
  const twitterUrl =
    source.socials?.twitter ||
    `https://x.com/search?q=${encodeURIComponent(source.title)}`;

  return (
    <div className="h-full rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-900/60 p-5 flex flex-col min-h-0 shadow-2xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-block text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
              {isFunding ? "Potential Funder" : source.source || "ScholarXiv"}
            </span>
            {source.year && (
              <span className="text-[11px] font-mono text-zinc-400">{source.year}</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 leading-snug">
            {source.title}
          </h3>
          {source.program && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
              {source.program}
            </p>
          )}
          {source.authors && source.authors.length > 0 && (
            <p className="text-xs text-zinc-500 italic truncate">
              {source.authors.join(", ")}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          title="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-0 text-xs">
        {/* Why this was selected / Match rationale */}
        {(source.whyMatch || source.summary) && (
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">
              {isFunding ? "How they were selected" : "Summary"}
            </span>
            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              {source.whyMatch || source.summary}
            </div>
          </div>
        )}

        {/* Official Channels & Socials */}
        {isFunding && (
          <div className="space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">
              Official Channels & Socials
            </span>
            <div className="space-y-1.5">
              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200/80 hover:border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Website</span>
                  </div>
                  <ExternalLink className="h-3 w-3 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
                </a>
              )}

              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200/80 hover:border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <LinkedinIcon className="h-3.5 w-3.5 text-zinc-400" />
                  <span>LinkedIn</span>
                </div>
                <ExternalLink className="h-3 w-3 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
              </a>

              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200/80 hover:border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <TwitterXIcon className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Twitter / X</span>
                </div>
                <ExternalLink className="h-3 w-3 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 shrink-0 space-y-2">
        {isFunding && onToggleSave && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onToggleSave(source)}
            className="flex items-center justify-center gap-2 w-full h-9 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 text-xs font-medium transition-colors dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isSaved ? (
              <BookmarkCheck className="h-3.5 w-3.5" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
            <span>{isSaved ? "Saved — remove bookmark" : "Save funder"}</span>
          </button>
        )}
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <span>{isFunding ? "Visit Program Page" : "View Paper"}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

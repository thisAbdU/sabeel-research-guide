"use client";

import * as React from "react";
import { Sparkles, User, AlertCircle, Copy, Check } from "lucide-react";
import { ChatMessageItem } from "@/types/chat";
import { SourceCard } from "./SourceCard";

interface ChatMessageProps {
  message: ChatMessageItem;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format time string
  const timeFormatted = React.useMemo(() => {
    if (!message.createdAt) return "";
    const date = typeof message.createdAt === "string" ? new Date(message.createdAt) : message.createdAt;
    return isNaN(date.getTime())
      ? ""
      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [message.createdAt]);

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-3 group">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-xl">
          <div className="rounded-2xl rounded-tr-xs bg-zinc-900 px-4 py-3 text-sm text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950 whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
          {timeFormatted && (
            <span className="mt-1 text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {timeFormatted}
            </span>
          )}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
          <User className="h-4 w-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 group">
      {/* Assistant Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900">
        <Sparkles className="h-4 w-4" />
      </div>

      {/* Message Body */}
      <div className="flex-1 max-w-[90%] sm:max-w-2xl space-y-3">
        <div
          className={`rounded-2xl rounded-tl-xs border p-4 sm:p-5 text-sm leading-relaxed shadow-xs transition-colors ${
            message.isError
              ? "border-red-200 bg-red-50/50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
              : "border-zinc-200/90 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
          }`}
        >
          {/* Header row with role name, mode tag, copy, and timestamp */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                ScholarXiv Companion
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                {message.mode}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {timeFormatted && <span className="text-[10px]">{timeFormatted}</span>}
              <button
                type="button"
                onClick={handleCopy}
                title="Copy response"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Message Content: Paragraphs and Markdown-friendly rendering */}
          {message.isError ? (
            <div className="flex items-start gap-2 text-xs">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{message.content}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 whitespace-pre-wrap">
              {message.content.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          {/* Research Directions (if any) */}
          {message.researchDirections && message.researchDirections.length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Suggested Research Directions:
              </span>
              <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                {message.researchDirections.map((dir, idx) => {
                  if (typeof dir === "string") {
                    return (
                      <li key={idx} className="list-disc ml-4">
                        {dir}
                      </li>
                    );
                  }
                  return (
                    <li
                      key={idx}
                      className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-2.5 dark:border-zinc-800 dark:bg-zinc-800/40"
                    >
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {dir.title}
                      </div>
                      {dir.description && (
                        <div className="mt-0.5 text-zinc-600 dark:text-zinc-400">
                          {dir.description}
                        </div>
                      )}
                      {dir.researchQuestion && (
                        <div className="mt-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 italic">
                          Q: {dir.researchQuestion}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Attached ScholarXiv Research Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              <span>ScholarXiv Literature Sources ({message.sources.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {message.sources.map((source) => (
                <SourceCard key={source.id} source={source} compact />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

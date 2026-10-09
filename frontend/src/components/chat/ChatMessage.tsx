"use client";

import * as React from "react";
import { Sparkles, User, AlertCircle, Copy, Check, ExternalLink } from "lucide-react";
import { ChatMessageItem } from "@/types/chat";
import { SourceCard } from "./SourceCard";

import { ResearchSource } from "@/types/chat";

interface ChatMessageProps {
  message: ChatMessageItem;
  onSelectSource?: (source: ResearchSource) => void;
  selectedSourceId?: string | null;
  isFunderSaved?: (source: ResearchSource) => boolean;
  isFunderSaving?: (source: ResearchSource) => boolean;
  onToggleSaveFunder?: (source: ResearchSource) => void;
}

function renderFormattedInline(text: string): React.ReactNode {
  // Precedence: links, bold-italic, bold, italic, code, strikethrough, bare URLs
  const pattern =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|`([^`]+)`|~~([^~]+)~~|(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      // Markdown link: [label](url)
      nodes.push(
        <a
          key={`md-link-${match.index}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 dark:text-blue-400 hover:underline decoration-blue-400/40 inline-flex items-center gap-0.5 break-words transition-colors"
        >
          <span>{match[1]}</span>
          <ExternalLink className="inline h-3 w-3 shrink-0 ml-0.5 opacity-80" />
        </a>
      );
    } else if (match[3]) {
      // Bold italic: ***text***
      nodes.push(
        <strong key={`bi-${match.index}`} className="font-semibold text-zinc-900 dark:text-zinc-100">
          <em className="italic">{match[3]}</em>
        </strong>
      );
    } else if (match[4]) {
      // Bold: **text**
      nodes.push(
        <strong key={`b-${match.index}`} className="font-semibold text-zinc-900 dark:text-zinc-100">
          {match[4]}
        </strong>
      );
    } else if (match[5]) {
      // Bold: __text__
      nodes.push(
        <strong key={`b2-${match.index}`} className="font-semibold text-zinc-900 dark:text-zinc-100">
          {match[5]}
        </strong>
      );
    } else if (match[6]) {
      // Italic: *text*
      nodes.push(
        <em key={`em-${match.index}`} className="italic text-zinc-800 dark:text-zinc-200">
          {match[6]}
        </em>
      );
    } else if (match[7]) {
      // Inline code: `text`
      nodes.push(
        <code
          key={`code-${match.index}`}
          className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-800 dark:text-zinc-200"
        >
          {match[7]}
        </code>
      );
    } else if (match[8]) {
      // Strikethrough: ~~text~~
      nodes.push(
        <span key={`strike-${match.index}`} className="line-through text-zinc-400">
          {match[8]}
        </span>
      );
    } else if (match[9]) {
      // Bare URL
      nodes.push(
        <a
          key={`url-${match.index}`}
          href={match[9]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 dark:text-blue-400 hover:underline decoration-blue-400/40 inline-flex items-center gap-0.5 break-all transition-colors"
        >
          <span>{match[9]}</span>
          <ExternalLink className="inline h-3 w-3 shrink-0 ml-0.5 opacity-80" />
        </a>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : text;
}

const SCORE_LINE_REGEX =
  /^(\*{0,2}(?:🔥\s*)?(?:Score:\s*)?(\d{1,3})\/100(?:\s+ROAST\s+SCORE)?\*{0,2})(?:\s*[—–-]\s*(.*))?$/i;

const LABEL_REGEX =
  /^(\*{0,2}(?:Title|Description|Research Question|Candidate Question|Focus|Suggested Pivot|Pivot|Methodology|Why it works|Why this idea might fail|Score|ROAST SCORE|Roast Score|Final verdict|Damage control|What's Actually Wrong|Scope explosion|Weak research gap|Weak counterfactual|Unclear methodology|Unclear measurement|Low originality|Missing variables|Measurement nightmare|Fatal flaws & blind spots|Submitted|The Paper Submitted|The Idea Submitted)\*{0,2}):\s*(.*)$/i;

function renderLineWithFormatting(line: string): React.ReactNode {
  // 1. Check for Score line: e.g. "72/100 ROAST SCORE" or "🔥 Score: 72/100 ROAST SCORE — Tag 1 • Tag 2"
  const scoreMatch = line.match(SCORE_LINE_REGEX);
  if (scoreMatch) {
    const scoreNum = parseInt(scoreMatch[2], 10);
    const tagText = scoreMatch[3];
    const colorClass =
      scoreNum >= 75
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
        : scoreNum >= 50
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
        : "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30";

    return (
      <div className="flex flex-wrap items-center gap-2 my-1">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono font-bold text-xs shadow-2xs ${colorClass}`}
        >
          <span>🔥</span>
          <span>{scoreNum}/100 ROAST SCORE</span>
        </span>
        {tagText && (
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {renderFormattedInline(tagText)}
          </span>
        )}
      </div>
    );
  }

  // 2. Check for key-value labels:
  const match = line.match(LABEL_REGEX);
  if (match) {
    const rawLabel = match[1].replace(/\*/g, "").trim();
    const rest = match[2];
    return (
      <span>
        <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{rawLabel}:</strong>{" "}
        {renderFormattedInline(rest)}
      </span>
    );
  }

  return renderFormattedInline(line);
}

function normalizeContent(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n");

  // Collapse isolated quotes across lines:
  text = text.replace(/([“"])\s*\n+([^\n"”]+?)\n+([”"])/g, '"$2"');
  text = text.replace(
    /(THE\s+(?:PAPER|IDEA|RESEARCH)\s+SUBMITTED)\s*\n+["“']?\s*\n*([^"”'\n]+?)\s*\n*["”']?(?=\n|$)/gi,
    '$1\n"$2"'
  );

  // Strip empty trailing dashes/bullets before EOF (cutoff cleanup)
  text = text.replace(/\n+\s*[-*•]\s*$/g, "");

  // Auto-bold unbolded "THE IDEA SUBMITTED" / "THE PAPER SUBMITTED"
  text = text.replace(/^(THE\s+(?:PAPER|IDEA|RESEARCH)\s+SUBMITTED)$/gim, "**$1**");

  return text;
}

type ContentBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "hr" }
  | { type: "quote"; text: string }
  | {
      type: "list";
      items: Array<{ marker: string; title: string; details: string[] }>;
    }
  | { type: "paragraph"; lines: string[] };

function parseBlocks(content: string): ContentBlock[] {
  const normalized = normalizeContent(content);
  const rawLines = normalized.split("\n");
  const blocks: ContentBlock[] = [];
  let i = 0;

  const isHeading = (line: string) => /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
  const isHr = (line: string) => /^\s*(?:---|\*\*\*|___)\s*$/.test(line);
  const isQuote = (line: string) => /^\s*>\s*(.*)$/.exec(line);
  const isBullet = (line: string) => /^\s*([*\-•]|\d+\.)\s+(.*)$/.exec(line);
  const isContinuation = (line: string) =>
    /^\s{2,}\S/.test(line) ||
    /^(?:Description|Research Question|Candidate Question|Focus|Suggested Pivot|Pivot|Methodology|Why it works|Measurement):\s*/i.test(
      line.trim()
    );

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // 1. Heading
    const headMatch = isHeading(line);
    if (headMatch) {
      blocks.push({
        type: "heading",
        level: headMatch[1].length,
        text: headMatch[2],
      });
      i++;
      continue;
    }

    // 2. Horizontal Rule
    if (isHr(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // 3. Blockquote
    const quoteMatch = isQuote(line);
    if (quoteMatch) {
      const quoteLines = [quoteMatch[1]];
      i++;
      while (i < rawLines.length && isQuote(rawLines[i])) {
        const qm = isQuote(rawLines[i]);
        if (qm) quoteLines.push(qm[1]);
        i++;
      }
      blocks.push({ type: "quote", text: quoteLines.join("\n") });
      continue;
    }

    // 4. List (Ordered or Unordered)
    const bulletMatch = isBullet(line);
    if (bulletMatch) {
      const items: Array<{ marker: string; title: string; details: string[] }> = [];

      while (i < rawLines.length) {
        const currLine = rawLines[i];
        const currTrimmed = currLine.trim();

        if (!currTrimmed) {
          // Lookahead for next continuation or next bullet item
          let nextIdx = i + 1;
          while (nextIdx < rawLines.length && !rawLines[nextIdx].trim()) {
            nextIdx++;
          }
          if (nextIdx < rawLines.length) {
            const nextLine = rawLines[nextIdx];
            if (isBullet(nextLine)) {
              i = nextIdx;
              continue;
            }
            if (isContinuation(nextLine) && items.length > 0) {
              items[items.length - 1].details.push(nextLine.trim());
              i = nextIdx + 1;
              continue;
            }
          }
          break;
        }

        const bMatch = isBullet(currLine);
        if (bMatch) {
          items.push({
            marker: bMatch[1],
            title: bMatch[2],
            details: [],
          });
          i++;
          continue;
        }

        if (items.length > 0 && isContinuation(currLine)) {
          items[items.length - 1].details.push(currTrimmed);
          i++;
          continue;
        }

        break;
      }

      blocks.push({ type: "list", items });
      continue;
    }

    // 5. Paragraph
    const paraLines: string[] = [];
    while (i < rawLines.length) {
      const currLine = rawLines[i];
      const currTrimmed = currLine.trim();

      if (!currTrimmed) {
        i++;
        break;
      }

      if (isHeading(currLine) || isHr(currLine) || isQuote(currLine) || isBullet(currLine)) {
        break;
      }

      paraLines.push(currTrimmed);
      i++;
    }

    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", lines: paraLines });
    }
  }

  return blocks;
}

function FormattedContent({ content }: { content: string }) {
  const blocks = React.useMemo(() => parseBlocks(content), [content]);

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading": {
            if (block.level === 1) {
              return (
                <h1
                  key={idx}
                  className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 pt-1 pb-1 border-b border-zinc-200/80 dark:border-zinc-800"
                >
                  {renderFormattedInline(block.text)}
                </h1>
              );
            }
            if (block.level === 2) {
              return (
                <h2
                  key={idx}
                  className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 pt-1"
                >
                  {renderFormattedInline(block.text)}
                </h2>
              );
            }
            if (block.level === 3) {
              return (
                <h3
                  key={idx}
                  className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 pt-1 flex items-center gap-1.5"
                >
                  {renderFormattedInline(block.text)}
                </h3>
              );
            }
            return (
              <h4
                key={idx}
                className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 pt-0.5"
              >
                {renderFormattedInline(block.text)}
              </h4>
            );
          }
          case "hr":
            return <hr key={idx} className="border-zinc-200 dark:border-zinc-800 my-2" />;
          case "quote":
            return (
              <div
                key={idx}
                className="rounded-xl border border-zinc-200/90 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-800/40 px-3.5 py-3 my-2 space-y-1.5 text-xs sm:text-sm shadow-2xs"
              >
                {block.text.split("\n").map((ql, qIdx) => (
                  <div key={qIdx}>{renderLineWithFormatting(ql)}</div>
                ))}
              </div>
            );
          case "list":
            return (
              <ul key={idx} className="space-y-2 my-2">
                {block.items.map((item, itemIdx) => {
                  const marker = /^\d+\.$/.test(item.marker) ? item.marker : "•";
                  return (
                    <li key={itemIdx} className="space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 shrink-0 select-none mt-0.5">
                          {marker}
                        </span>
                        <div className="flex-1 space-y-1">
                          <div>{renderLineWithFormatting(item.title)}</div>
                          {item.details.length > 0 && (
                            <div className="space-y-1 pl-2.5 border-l-2 border-zinc-200 dark:border-zinc-800 ml-0.5 mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                              {item.details.map((det, dIdx) => (
                                <div key={dIdx}>{renderLineWithFormatting(det)}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            );
          case "paragraph":
            return (
              <div key={idx} className="space-y-1">
                {block.lines.map((line, lIdx) => (
                  <p key={lIdx}>{renderLineWithFormatting(line)}</p>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export function ChatMessage({
  message,
  onSelectSource,
  selectedSourceId,
  isFunderSaved,
  isFunderSaving,
  onToggleSaveFunder,
}: ChatMessageProps) {
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
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Message Content: Paragraphs with markdown link rendering */}
          {message.isError ? (
            <div className="flex items-start gap-2 text-xs">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{message.content}</p>
              </div>
            </div>
          ) : (
            <FormattedContent content={message.content} />
          )}

          {/* Research Directions (if any) */}
          {message.mode !== "funding" && message.researchDirections && message.researchDirections.length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Suggested Research Directions:
              </span>
              <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                {message.researchDirections.map((dir, idx) => {
                  if (typeof dir === "string") {
                    return (
                      <li key={idx} className="list-disc ml-4">
                        {renderFormattedInline(dir)}
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
                          {renderFormattedInline(dir.description)}
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

        {/* Attached Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
              <span>
                {message.mode === "funding" ? "Potential Funders" : "ScholarXiv Literature Sources"} ({message.sources.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {message.sources.map((source) => (
                <SourceCard
                  key={source.id}
                  source={source}
                  compact
                  variant={message.mode === "funding" ? "funding" : "paper"}
                  isSelected={selectedSourceId === source.id}
                  onSelect={onSelectSource}
                  isSaved={isFunderSaved?.(source)}
                  isSaving={isFunderSaving?.(source)}
                  onToggleSave={
                    message.mode === "funding" ? onToggleSaveFunder : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

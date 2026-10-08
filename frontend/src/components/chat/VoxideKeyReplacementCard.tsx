"use client";

import * as React from "react";
import { ExternalLink, Key, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { isValidVoxidePublicKey } from "@/lib/voxide";

interface VoxideKeyReplacementCardProps {
  onReplaceKey: (newKey: string) => Promise<{ success: boolean; error?: string }>;
  onSuccess?: () => void;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

export function VoxideKeyReplacementCard({
  onReplaceKey,
  onSuccess,
  onDismiss,
  className = "",
  compact = false,
}: VoxideKeyReplacementCardProps) {
  const [keyInput, setKeyInput] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successNotice, setSuccessNotice] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = keyInput.trim();

    if (!trimmed) {
      setValidationError("That doesn't look like a valid Voxide public API key.");
      inputRef.current?.focus();
      return;
    }

    if (!isValidVoxidePublicKey(trimmed)) {
      setValidationError("That doesn't look like a valid Voxide public API key.");
      inputRef.current?.focus();
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    try {
      const res = await onReplaceKey(trimmed);
      if (res.success) {
        setSuccessNotice(true);
        setKeyInput("");
        setTimeout(() => {
          onSuccess?.();
        }, 600);
      } else {
        setValidationError(res.error || "The provided Voxide key could not be verified. Please check and retry.");
      }
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : "Failed to initialize the new Voxide key.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Voxide Credit Renewal"
      className={`rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 p-4 sm:p-5 text-left shadow-lg transition-all ${className}`}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm">
            <Key className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Voice credits have expired
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              Your Voxide voice credits are no longer available. Create a new Voxide API key and paste it below to continue using live voice.
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer shrink-0"
            title="Dismiss"
            aria-label="Dismiss key replacement"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dashboard Link Guide */}
      <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-1.5">
        <span>Create a new key from your Voxide dashboard:</span>
        <a
          href="https://voxide.app/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-zinc-900 dark:text-zinc-100 underline underline-offset-4 hover:opacity-80 transition-opacity"
        >
          <span>voxide.app/dashboard</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Form Input Row */}
      <form onSubmit={handleSubmit} className="mt-3 space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Paste your Voxide public API key"
              aria-label="Paste your Voxide public API key"
              disabled={isSubmitting || successNotice}
              className={`h-10 w-full rounded-xl border bg-zinc-50/50 dark:bg-zinc-900/60 px-3.5 text-xs sm:text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 placeholder:font-sans focus:outline-none transition-all ${
                validationError
                  ? "border-red-500 focus:border-red-500"
                  : "border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-100 focus:bg-white dark:focus:bg-zinc-900"
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || successNotice}
            className="h-10 px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs sm:text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Verifying…</span>
              </>
            ) : successNotice ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Key Applied</span>
              </>
            ) : (
              <span>Use New Key</span>
            )}
          </button>
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Success Feedback */}
        {successNotice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>New key initialized successfully. Resuming live voice…</span>
          </div>
        )}
      </form>
    </div>
  );
}

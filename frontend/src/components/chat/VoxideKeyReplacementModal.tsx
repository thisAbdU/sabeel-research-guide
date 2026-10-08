"use client";

import * as React from "react";
import { ExternalLink, Key, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { isValidVoxidePublicKey } from "@/lib/voxide";

interface VoxideKeyReplacementModalProps {
  open: boolean;
  onClose: () => void;
  onReplaceKey: (newKey: string) => Promise<{ success: boolean; error?: string }>;
}

export function VoxideKeyReplacementModal({
  open,
  onClose,
  onReplaceKey,
}: VoxideKeyReplacementModalProps) {
  const [keyInput, setKeyInput] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successNotice, setSuccessNotice] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setKeyInput("");
      setValidationError(null);
      setSuccessNotice(false);
      setIsSubmitting(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Handle Escape key to dismiss
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

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
        setTimeout(() => {
          onClose();
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
      role="dialog"
      aria-modal="true"
      aria-label="Voice credits expired"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-fadeIn"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 text-left transition-all">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-sm">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Voice credits have expired
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Your Voxide voice credits are no longer available. Create a new Voxide API key and paste it below to continue using live voice.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer shrink-0"
            title="Close"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dashboard Link Guide */}
        <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-600 dark:text-zinc-400 flex flex-wrap items-center gap-1.5">
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="voxide-api-key-input" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Paste your Voxide public API key
            </label>
            <input
              id="voxide-api-key-input"
              ref={inputRef}
              type="text"
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="vox_pub_..."
              aria-label="Paste your Voxide public API key"
              disabled={isSubmitting || successNotice}
              className={`h-10 w-full rounded-xl border bg-white dark:bg-zinc-900/60 px-3.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none transition-all ${
                validationError
                  ? "border-red-500 focus:border-red-500"
                  : "border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-100"
              }`}
            />
          </div>

          {/* Validation Error Banner (Website standard theme) */}
          {validationError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Success Banner */}
          {successNotice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>New key verified. Resuming live voice…</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs sm:text-sm font-medium transition-all cursor-pointer"
            >
              Return to text chat
            </button>

            <button
              type="submit"
              disabled={isSubmitting || successNotice}
              className="h-10 px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs sm:text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying…</span>
                </>
              ) : successNotice ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Applied</span>
                </>
              ) : (
                <span>Use New Key</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

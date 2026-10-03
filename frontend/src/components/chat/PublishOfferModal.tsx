"use client";

import * as React from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { SUPPORT_PROVIDERS } from "@/lib/support-providers";

type PaperPreview = {
  title: string;
  url: string;
  authors?: string[];
  summary?: string;
};

interface PublishOfferModalProps {
  open: boolean;
  conversationId: string | null;
  paperUrl: string | null;
  onClose: () => void;
  onPublished: (projectId: string) => void;
}

export function PublishOfferModal({
  open,
  conversationId,
  paperUrl,
  onClose,
  onPublished,
}: PublishOfferModalProps) {
  const [step, setStep] = React.useState<"offer" | "payment" | "done">("offer");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [paper, setPaper] = React.useState<PaperPreview | null>(null);
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const [needsPayment, setNeedsPayment] = React.useState(true);
  const [provider, setProvider] = React.useState("telebirr");
  const [accountId, setAccountId] = React.useState("");
  const [accountName, setAccountName] = React.useState("");
  const [urlInput, setUrlInput] = React.useState(paperUrl ?? "");

  React.useEffect(() => {
    if (!open) return;
    setStep("offer");
    setError(null);
    setPaper(null);
    setProjectId(null);
    setUrlInput(paperUrl ?? "");
  }, [open, paperUrl]);

  if (!open) return null;

  const createDraft = async (url: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{
        data: {
          status: string;
          project: { id: string };
          paper: PaperPreview;
          paymentConfigured: boolean;
        };
      }>("/api/research/from-link", {
        method: "POST",
        body: JSON.stringify({
          researchUrl: url,
          conversationId,
          confirmPublish: false,
        }),
      });
      setPaper(res.data.paper);
      setProjectId(res.data.project.id);
      setNeedsPayment(!res.data.paymentConfigured);
      if (res.data.paymentConfigured) {
        await publish(res.data.project.id, url);
      } else {
        setStep("payment");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare research for publishing");
    } finally {
      setBusy(false);
    }
  };

  const publish = async (id: string, url: string, methods?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{
        data: { status: string; project: { id: string } };
      }>("/api/research/from-link", {
        method: "POST",
        body: JSON.stringify({
          researchUrl: url,
          conversationId,
          confirmPublish: true,
          paymentMethods: methods,
        }),
      });
      setProjectId(res.data.project.id);
      setStep("done");
      onPublished(res.data.project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
      setStep("payment");
    } finally {
      setBusy(false);
    }
  };

  const handleAgree = async () => {
    const url = urlInput.trim();
    if (!url) {
      setError("Paste your ScholarXiv research link first");
      return;
    }
    await createDraft(url);
  };

  const handleSavePaymentAndPublish = async () => {
    if (!accountId.trim() || !accountName.trim()) {
      setError("Account number and account name are required");
      return;
    }
    const url = urlInput.trim() || paper?.url;
    if (!url || !projectId) {
      setError("Missing research link");
      return;
    }
    await publish(projectId, url, [
      {
        provider,
        accountId: accountId.trim(),
        accountName: accountName.trim(),
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Publish to Discover?
              </h2>
              <p className="text-xs text-zinc-500">
                Readers can view your ScholarXiv paper and tip you via Links.et.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {step === "offer" && (
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              ScholarXiv research link
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.scholarxiv.com/journal/sx.2608.00004"
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              />
            </label>
            {paper && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">{paper.title}</div>
                <p className="mt-1 text-zinc-500 line-clamp-3">{paper.summary}</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
                Not now
              </Button>
              <Button size="sm" onClick={() => void handleAgree()} disabled={busy} className="gap-2">
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Yes, publish
              </Button>
            </div>
          </div>
        )}

        {step === "payment" && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-zinc-500">
              {needsPayment
                ? "Add Telebirr or bank details so supporters can tip you. Required once before publishing."
                : "Confirm payment details to finish publishing."}
            </p>
            {paper && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">{paper.title}</div>
              </div>
            )}
            <label className="block text-xs font-medium text-zinc-600">
              Provider
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                {SUPPORT_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Account number / wallet
              <input
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Account name
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSavePaymentAndPublish()}
                disabled={busy}
                className="gap-2"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save & publish
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="mt-4 space-y-3 text-center">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Published on Discover
            </p>
            <p className="text-xs text-zinc-500">
              Your research card is live. Readers can open ScholarXiv and send tips.
            </p>
            <div className="flex justify-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <a href="/discover">
                <Button size="sm">Open Discover</Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

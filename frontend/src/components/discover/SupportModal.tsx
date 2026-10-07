"use client";

import * as React from "react";
import { Coffee, Copy, Loader2, Trophy, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { listTopSupporters, type TopSupporter } from "@/services/funding";

type CheckoutMethod = {
  provider: string;
  accountId: string;
  accountName: string;
};

interface SupportModalProps {
  open: boolean;
  researchId: string;
  researchTitle: string;
  onClose: () => void;
}

export function SupportModal({
  open,
  researchId,
  researchTitle,
  onClose,
}: SupportModalProps) {
  const [amount, setAmount] = React.useState("50");
  const [name, setName] = React.useState("");
  const [anonymous, setAnonymous] = React.useState(false);
  const [paymentId, setPaymentId] = React.useState<string | null>(null);
  const [reference, setReference] = React.useState<string | null>(null);
  const [methods, setMethods] = React.useState<CheckoutMethod[]>([]);
  const [receiptUrl, setReceiptUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [supporters, setSupporters] = React.useState<TopSupporter[]>([]);
  const [supportersLoading, setSupportersLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setAmount("50");
    setName("");
    setAnonymous(false);
    setPaymentId(null);
    setReference(null);
    setMethods([]);
    setReceiptUrl("");
    setStatus(null);
    setError(null);
    setSupporters([]);
    setSupportersLoading(true);
    let cancelled = false;
    void listTopSupporters(researchId)
      .then((list) => {
        if (!cancelled) setSupporters(list);
      })
      .catch(() => {
        if (!cancelled) setSupporters([]);
      })
      .finally(() => {
        if (!cancelled) setSupportersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, researchId]);

  if (!open) return null;

  const startTip = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid tip amount");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{
        data: {
          paymentId: string;
          paymentReference: string;
          checkout: { methods: CheckoutMethod[] };
        };
      }>("/api/support", {
        method: "POST",
        body: JSON.stringify({
          researchProjectId: researchId,
          amount: value,
          currency: "etb",
          supporterName: anonymous ? null : name.trim() || null,
          anonymous,
        }),
      });
      setPaymentId(res.data.paymentId);
      setReference(res.data.paymentReference);
      setMethods(res.data.checkout.methods ?? []);
      setStatus("Transfer using the account below, then upload your receipt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start tip");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (payload: { url?: string; imageBase64?: string }) => {
    if (!paymentId) return;
    setBusy(true);
    setError(null);
    setStatus("Verifying receipt…");
    try {
      // links.et may return 202 while the bank fetch finishes; retry a few times.
      let lastStatus = "processing";
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const res = await apiFetch<{
          data: { status: string; error?: string; retryable?: boolean };
        }>("/api/support/verify", {
          method: "POST",
          body: JSON.stringify({ paymentId, ...payload }),
        });
        lastStatus = res.data.status;
        if (lastStatus === "successful" || lastStatus === "completed") {
          setStatus("Payment verified. Thank you for supporting this research!");
          return;
        }
        if (lastStatus !== "processing") {
          setError(res.data.error || `Verification ${lastStatus}`);
          setStatus(null);
          return;
        }
        setStatus("Still verifying with the bank…");
        await new Promise((r) => setTimeout(r, 2000));
      }
      setStatus(`Verification status: ${lastStatus}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      void verify({ imageBase64: base64 });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Coffee className="h-4 w-4" />
              Support researcher
            </h2>
            <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{researchTitle}</p>
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
        {status && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
            {status}
          </p>
        )}

        {!paymentId ? (
          <div className="mt-4 space-y-3">
            {(supportersLoading || supporters.length > 0) && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <Trophy className="h-3 w-3 text-amber-500" />
                  Top supporters
                </div>
                {supportersLoading ? (
                  <div className="mt-2 flex justify-center py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                  </div>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {supporters.map((s, i) => (
                      <li
                        key={`${s.displayName}-${i}`}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate text-zinc-700 dark:text-zinc-300">
                          <span className="mr-1.5 font-mono text-[10px] text-zinc-400">
                            {i + 1}.
                          </span>
                          {s.displayName}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                          {Number.isInteger(s.amount) ? s.amount : s.amount.toFixed(2)}{" "}
                          {s.currency.toUpperCase()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <label className="block text-xs font-medium text-zinc-600">
              Amount (ETB)
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Your name (optional)
              <input
                value={name}
                disabled={anonymous}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
              />
              Tip anonymously
            </label>
            <Button size="sm" className="w-full gap-2" disabled={busy} onClick={() => void startTip()}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Continue to payment details
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {reference && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="text-zinc-500">Include this reference in the transfer note</div>
                <div className="mt-1 flex items-center justify-between gap-2 font-mono text-zinc-900 dark:text-zinc-100">
                  <span>{reference}</span>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(reference)}
                    className="text-zinc-400 hover:text-zinc-700"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {methods.map((method) => (
                <div
                  key={`${method.provider}-${method.accountId}`}
                  className="rounded-xl border border-zinc-200 p-3 text-xs dark:border-zinc-800"
                >
                  <div className="font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">
                    {method.provider}
                  </div>
                  <div className="mt-1 text-zinc-900 dark:text-zinc-100">{method.accountName}</div>
                  <div className="font-mono text-zinc-600 dark:text-zinc-400">{method.accountId}</div>
                </div>
              ))}
            </div>
            <label className="block text-xs font-medium text-zinc-600">
              Receipt link (optional)
              <div className="mt-1 flex gap-2">
                <input
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-10 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !receiptUrl.trim()}
                  onClick={() => void verify({ url: receiptUrl.trim() })}
                >
                  Verify
                </Button>
              </div>
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 py-4 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
              <Upload className="h-4 w-4" />
              Upload receipt screenshot
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <Button variant="ghost" size="sm" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

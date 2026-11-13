"use client";

import { useState } from "react";

interface RevealSecretDialogProps {
  secret: string;
  onClose: () => void;
}

export function RevealSecretDialog({ secret, onClose }: RevealSecretDialogProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (permissions, insecure context, etc.) — the
      // secret is still selectable as plain text below.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-background p-6">
        <h2 className="text-lg font-semibold">API Key dibuat</h2>
        <p className="mt-1 text-sm text-amber-400">
          Simpan sekarang — secret ini hanya ditampilkan sekali dan tidak bisa dilihat lagi.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
          <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm">{secret}</code>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-md border border-border px-2 py-1 text-xs hover:border-foreground"
          >
            {copied ? "Tersalin" : "Salin"}
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

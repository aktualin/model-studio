"use client";

import { useState, type FormEvent } from "react";
import type { CreateApiKeyResponseBody } from "@/types/api-key";

interface CreateKeyDialogProps {
  onClose: () => void;
  onCreated: (key: CreateApiKeyResponseBody) => void;
}

export function CreateKeyDialog({ onClose, onCreated }: CreateKeyDialogProps) {
  const [name, setName] = useState("");
  const [requestsPerSecond, setRequestsPerSecond] = useState(5);
  const [tokensPerMinute, setTokensPerMinute] = useState(100_000);
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          requestsPerSecond,
          tokensPerMinute,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Gagal membuat API key.");
      }
      onCreated(body as CreateApiKeyResponseBody);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat API key.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-6">
        <h2 className="text-lg font-semibold">Buat API Key</h2>
        <p className="mt-1 text-sm text-muted">
          Key akan memproksi ke provider yang dikonfigurasi di server, dengan limit sendiri.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Nama
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="misalnya: aplikasi-mobile"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Limit per detik
              <input
                type="number"
                min={1}
                required
                value={requestsPerSecond}
                onChange={(event) => setRequestsPerSecond(Number(event.target.value))}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Token per menit
              <input
                type="number"
                min={1}
                required
                value={tokensPerMinute}
                onChange={(event) => setTokensPerMinute(Number(event.target.value))}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Kedaluwarsa (opsional)
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {submitting ? "Membuat…" : "Buat Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

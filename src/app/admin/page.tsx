"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiKeySummaryDTO, CreateApiKeyResponseBody } from "@/types/api-key";
import { KeysTable } from "./_components/KeysTable";
import { CreateKeyDialog } from "./_components/CreateKeyDialog";
import { RevealSecretDialog } from "./_components/RevealSecretDialog";

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<ApiKeySummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/keys");
      if (!response.ok) {
        throw new Error("Gagal memuat daftar API key.");
      }
      setKeys(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat daftar API key.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  function handleCreated(created: CreateApiKeyResponseBody) {
    setIsCreateOpen(false);
    setRevealedSecret(created.secret);
    void loadKeys();
  }

  async function handleRevoke(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/keys/${id}`, { method: "PATCH" });
      await loadKeys();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus API key ini secara permanen?")) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/keys/${id}`, { method: "DELETE" });
      await loadKeys();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">API Keys</h1>
          <p className="mt-1 text-sm text-muted">
            Setiap key memproksi ke provider yang sama, dengan limit dan masa berlakunya sendiri.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Buat API Key
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Memuat…</p>
      ) : (
        <KeysTable keys={keys} busyId={busyId} onRevoke={handleRevoke} onDelete={handleDelete} />
      )}

      {isCreateOpen && (
        <CreateKeyDialog onClose={() => setIsCreateOpen(false)} onCreated={handleCreated} />
      )}
      {revealedSecret && (
        <RevealSecretDialog secret={revealedSecret} onClose={() => setRevealedSecret(null)} />
      )}
    </div>
  );
}

import type { ApiKeySummaryDTO } from "@/types/api-key";
import { formatCount, formatDateTime } from "./format";

interface KeysTableProps {
  keys: ApiKeySummaryDTO[];
  busyId: string | null;
  onRevoke: (id: string) => void;
  onDelete: (id: string) => void;
}

function getStatus(key: ApiKeySummaryDTO): { label: string; className: string } {
  if (key.revokedAt) {
    return { label: "Dicabut", className: "text-red-400 border-red-900/60 bg-red-950/40" };
  }
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()) {
    return { label: "Kedaluwarsa", className: "text-amber-400 border-amber-900/60 bg-amber-950/40" };
  }
  return { label: "Aktif", className: "text-emerald-400 border-emerald-900/60 bg-emerald-950/40" };
}

export function KeysTable({ keys, busyId, onRevoke, onDelete }: KeysTableProps) {
  if (keys.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
        Belum ada API key. Buat satu untuk mulai memanggil proxy di{" "}
        <code className="rounded bg-surface px-1 py-0.5">/api/v1/*</code>.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted">
            <th className="px-4 py-3 font-medium">Nama</th>
            <th className="px-4 py-3 font-medium">Key</th>
            <th className="px-4 py-3 font-medium">Limit</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Expired</th>
            <th className="px-4 py-3 font-medium">Dipakai terakhir</th>
            <th className="px-4 py-3 font-medium">Usage</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const status = getStatus(key);
            const busy = busyId === key.id;
            return (
              <tr key={key.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3">{key.name}</td>
                <td className="px-4 py-3 font-mono text-muted">{key.keyPrefix}…</td>
                <td className="px-4 py-3 font-mono text-muted">
                  {key.requestsPerSecond} rps · {formatCount(key.tokensPerMinute.toString())} tpm
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${status.className}`}>
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{formatDateTime(key.expiresAt)}</td>
                <td className="px-4 py-3 text-muted">{formatDateTime(key.lastUsedAt)}</td>
                <td className="px-4 py-3 text-muted">
                  {formatCount(key.requestCount)} req · {formatCount(key.tokenCount)} tok
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {!key.revokedAt && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onRevoke(key.id)}
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-amber-800 hover:text-amber-400 disabled:opacity-50"
                      >
                        Cabut
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDelete(key.id)}
                      className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-red-800 hover:text-red-400 disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

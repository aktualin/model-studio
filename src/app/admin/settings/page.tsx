function activeModel(provider: string): string {
  if (provider === "modelstudio") {
    return process.env.MODEL_STUDIO_MODEL || "(MODEL_STUDIO_MODEL belum diset)";
  }
  return process.env.ANTHROPIC_MODEL || "(ANTHROPIC_MODEL belum diset)";
}

export default function SettingsPage() {
  const provider = process.env.AI_PROVIDER ?? "anthropic";

  const rows: Array<[string, string]> = [
    ["Provider aktif", provider],
    ["Model default", activeModel(provider)],
    ["Endpoint proxy", "/api/v1/*"],
    [
      "Upstream",
      provider === "modelstudio"
        ? process.env.MODEL_STUDIO_BASE_URL || "(belum diset)"
        : "https://api.anthropic.com",
    ],
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Pengaturan</h1>
        <p className="mt-1 text-sm text-muted">
          Nilai-nilai ini berasal dari environment variable server. Ubah lewat{" "}
          <code className="rounded bg-surface px-1 py-0.5">.env.local</code> (atau dashboard
          Vercel) lalu deploy ulang — tidak bisa diubah dari halaman ini.
        </p>
      </div>

      <dl className="divide-y divide-border rounded-lg border border-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="font-mono text-sm">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-sm text-muted">
        Semua API key yang dibuat di halaman{" "}
        <a href="/admin" className="underline hover:text-foreground">
          API Keys
        </a>{" "}
        memanggil upstream yang sama di atas — jadi satu plan/token provider dipakai bersama oleh
        banyak key virtual, masing-masing dengan limitnya sendiri.
      </p>
    </div>
  );
}

interface NavbarProps {
  provider: string;
}

export function Navbar({ provider }: NavbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
      <div className="flex items-center gap-2">
        <span className="font-semibold tracking-tight">Model Studio</span>
        <span className="text-sm text-muted">Admin</span>
      </div>
      <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
        provider: {provider}
      </span>
    </header>
  );
}

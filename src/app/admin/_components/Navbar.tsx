import { signOut } from "@/lib/auth";

interface NavbarProps {
  provider: string;
  email?: string | null;
}

export function Navbar({ provider, email }: NavbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
      <div className="flex items-center gap-2">
        <span className="font-semibold tracking-tight">Model Studio</span>
        <span className="text-sm text-muted">Admin</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
          provider: {provider}
        </span>
        {email && (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <span className="mr-2 hidden text-xs text-muted sm:inline">{email}</span>
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1 text-xs text-muted hover:border-foreground hover:text-foreground"
            >
              Keluar
            </button>
          </form>
        )}
      </div>
    </header>
  );
}

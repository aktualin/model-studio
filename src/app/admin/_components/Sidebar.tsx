"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "API Keys" },
  { href: "/admin/settings", label: "Pengaturan" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-4 py-2 text-sm md:w-56 md:flex-col md:border-b-0 md:border-r md:px-3 md:py-4">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-md px-3 py-2 transition-colors ${
              active
                ? "bg-surface text-foreground"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

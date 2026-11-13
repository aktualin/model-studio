import type { ReactNode } from "react";
import { Navbar } from "./_components/Navbar";
import { Sidebar } from "./_components/Sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const provider = process.env.AI_PROVIDER ?? "anthropic";

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Navbar provider={provider} />
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

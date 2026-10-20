"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/client";

const links = [
  { href: "/", label: "Timer" },
  { href: "/history", label: "History" },
];

export function AppHeader({ userName, children }: { userName: string; children?: React.ReactNode }) {
  const pathname = usePathname();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3">
      <div className="flex items-center gap-6">
        <h1 className="font-semibold">Timelogger</h1>
        <nav className="flex gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "font-medium text-foreground" : "text-muted hover:text-foreground"}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4 text-sm">
        {children}
        <span className="text-muted">{userName}</span>
        <button onClick={logout} className="rounded-md border border-border px-3 py-1 hover:bg-panel">Sign out</button>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  Search,
  BarChart3,
  Users,
  Settings,
  Moon,
  Sun,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents/new", label: "รับหนังสือใหม่", icon: FilePlus2 },
  { href: "/documents", label: "รายการหนังสือ", icon: FileText },
  { href: "/search", label: "ค้นหา", icon: Search },
  { href: "/reports", label: "รายงาน / สถิติ", icon: BarChart3 },
  { href: "/users", label: "จัดการผู้ใช้", icon: Users },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    apiFetch<{ user: { fullName: string } }>("/api/auth/me")
      .then((r) => setFullName(r.user.fullName))
      .catch(() => {});
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed z-30 inset-y-0 left-0 w-64 border-r border-border bg-card transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b border-border">
          <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">
            ตร
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">งานธุรการสอบสวน</p>
            <p className="text-xs text-muted-foreground">สภ.ไม้แก่น</p>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground/80"
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 lg:ml-64">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 sticky top-0 bg-background/80 backdrop-blur z-20">
          <button className="lg:hidden" onClick={() => setOpen((v) => !v)}>
            <Menu />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <button onClick={toggleDark} className="p-2 rounded-md hover:bg-muted" aria-label="toggle theme">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className="text-sm text-muted-foreground hidden sm:inline">{fullName}</span>
            <button onClick={logout} className="p-2 rounded-md hover:bg-muted text-destructive" aria-label="logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

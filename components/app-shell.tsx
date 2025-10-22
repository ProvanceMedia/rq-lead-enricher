"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  roles?: Array<"admin" | "operator" | "read_only">;
};

const navigation: NavItem[] = [
  { href: "/queue", label: "Queue" },
  { href: "/activity", label: "Activity" },
  { href: "/settings", label: "Settings", roles: ["admin"] }
];

type AppShellProps = {
  children: React.ReactNode;
  user: {
    name: string | null;
    role: "admin" | "operator" | "read_only";
  };
};

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNavigation = navigation.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside
        className={cn(
          "fixed inset-y-0 z-40 w-64 border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center px-6">
          <span className="text-lg font-semibold text-slate-900">
            RoboQuill Outreach
          </span>
        </div>
        <nav className="space-y-1 px-3 pb-6">
          {visibleNavigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-slate-900 text-slate-50"
                    : "text-slate-700 hover:bg-slate-100"
                )}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8">
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation</span>
          </button>
          <div className="flex flex-1 items-center justify-end gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user.name ?? "User"} · {user.role.replace("_", " ")}
            </span>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

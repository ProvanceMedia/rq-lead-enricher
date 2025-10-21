import Link from "next/link";
import { Role } from "@prisma/client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/queue", label: "Queue" },
  { href: "/activity", label: "Activity" }
] as const;

interface AppShellProps {
  children: React.ReactNode;
  activePath: string;
  user: {
    name?: string | null;
    email?: string | null;
    role: Role;
  };
}

export function AppShell({ children, activePath, user }: AppShellProps) {
  return (
    <div className="min-h-screen bg-muted/10">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/queue" className="text-lg font-semibold">
              RoboQuill Outreach
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "transition-colors hover:text-foreground/80",
                    activePath.startsWith(item.href)
                      ? "text-foreground"
                      : "text-foreground/60"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              {user.role === "admin" ? (
                <Link
                  href="/settings"
                  className={cn(
                    "transition-colors hover:text-foreground/80",
                    activePath.startsWith("/settings")
                      ? "text-foreground"
                      : "text-foreground/60"
                  )}
                >
                  Settings
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm leading-tight">
              <p className="font-medium">{user.name ?? user.email ?? "User"}</p>
              <p className="text-muted-foreground capitalize">{user.role}</p>
            </div>
            <Separator orientation="vertical" className="h-6" />
            <SignOutButton variant="outline" size="sm">
              Sign out
            </SignOutButton>
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}

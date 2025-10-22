import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

type DashboardLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const { dbUser } = await requireUser();

  return (
    <AppShell
      user={{
        name: dbUser.name ?? dbUser.email,
        role: dbUser.role as "admin" | "operator" | "read_only"
      }}
    >
      {children}
    </AppShell>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getSettingsMap } from "@/lib/services/settings";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { dbUser } = await requireUser(["admin", "operator", "read_only"]);
  const settings = await getSettingsMap();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsClient initialSettings={settings} role={dbUser.role as "admin" | "operator" | "read_only"} />
        </CardContent>
      </Card>
    </div>
  );
}

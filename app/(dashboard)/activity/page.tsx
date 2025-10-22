import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { listActivity } from "@/lib/services/events";
import { ActivityClient } from "./activity-client";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  await requireUser(["admin", "operator", "read_only"]);
  const initial = await listActivity({ limit: 100 });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Activity timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityClient initialData={initial} />
        </CardContent>
      </Card>
    </div>
  );
}

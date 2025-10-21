"use client";

import { useState, useTransition } from "react";
import { TestTube, Wifi, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ConnectionTarget = "apollo" | "hubspot" | "redis" | "db";

interface SettingsFormProps {
  settings: {
    dailyQuota: number;
    segmentFilters: string;
    coolDownRules: string;
    skipRules: string;
    notificationTargets: string;
  };
  envStatus: Array<{ key: string; configured: boolean; label: string }>;
}

export function SettingsForm({ settings, envStatus }: SettingsFormProps) {
  const [dailyQuota, setDailyQuota] = useState(settings.dailyQuota);
  const [segmentFilters, setSegmentFilters] = useState(settings.segmentFilters);
  const [coolDownRules, setCoolDownRules] = useState(settings.coolDownRules);
  const [skipRules, setSkipRules] = useState(settings.skipRules);
  const [notificationTargets, setNotificationTargets] = useState(
    settings.notificationTargets
  );

  const [saving, startSaving] = useTransition();
  const [testingTarget, setTestingTarget] = useState<ConnectionTarget | null>(
    null
  );

  const handleSave = () => {
    startSaving(async () => {
      const updates = [
        { key: "daily_quota", value: dailyQuota },
        { key: "segment_filters", value: safeParse(segmentFilters) },
        { key: "cool_down_rules", value: safeParse(coolDownRules) },
        { key: "skip_rules", value: safeParse(skipRules) },
        { key: "notification_targets", value: safeParse(notificationTargets) }
      ];

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error ?? "Failed to update settings");
        return;
      }

      alert("Settings updated successfully");
    });
  };

  async function handleTest(target: ConnectionTarget) {
    setTestingTarget(target);
    try {
      const response = await fetch("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        alert(
          `Connection test failed for ${target}: ${data.error ?? "unknown error"}`
        );
      } else {
        alert(`Connection test succeeded for ${target}`);
      }
    } finally {
      setTestingTarget(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Approval Settings</CardTitle>
            <CardDescription>
              Configure quotas, segments, and routing rules for enrichment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Daily quota
              </label>
              <Input
                type="number"
                value={dailyQuota}
                onChange={(event) => setDailyQuota(Number(event.target.value))}
                min={0}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Segment filters (JSON)
              </label>
              <Textarea
                value={segmentFilters}
                onChange={(event) => setSegmentFilters(event.target.value)}
                rows={6}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Cool down rules (JSON)
              </label>
              <Textarea
                value={coolDownRules}
                onChange={(event) => setCoolDownRules(event.target.value)}
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Skip rules (JSON)
              </label>
              <Textarea
                value={skipRules}
                onChange={(event) => setSkipRules(event.target.value)}
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Notification targets (JSON)
              </label>
              <Textarea
                value={notificationTargets}
                onChange={(event) => setNotificationTargets(event.target.value)}
                rows={3}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-fit">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection Tests</CardTitle>
            <CardDescription>
              Validate integrations before deploying changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(["apollo", "hubspot", "redis", "db"] as ConnectionTarget[]).map(
              (target) => (
                <Button
                  key={target}
                  variant="outline"
                  onClick={() => handleTest(target)}
                  disabled={testingTarget !== null}
                  className="justify-start"
                >
                  <TestTube className="mr-2 h-4 w-4" />
                  {testingTarget === target
                    ? `Testing ${target}...`
                    : `Test ${target}`}
                </Button>
              )
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration Keys</CardTitle>
          <CardDescription>
            Secrets are stored in environment variables and cannot be edited
            here. Toggle status to confirm configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {envStatus.map((envVar) => (
            <div
              key={envVar.key}
              className="flex items-center justify-between rounded border p-3"
            >
              <div>
                <p className="font-medium">{envVar.label}</p>
                <p className="text-xs text-muted-foreground">{envVar.key}</p>
              </div>
              <Badge variant={envVar.configured ? "secondary" : "destructive"}>
                {envVar.configured ? "Configured" : "Missing"}
              </Badge>
            </div>
          ))}
          <Button variant="ghost" className="w-full justify-start">
            <Wifi className="mr-2 h-4 w-4" />
            Secrets managed via DigitalOcean App Platform
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function safeParse(value: string) {
  if (value.trim().length === 0) {
    return {};
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

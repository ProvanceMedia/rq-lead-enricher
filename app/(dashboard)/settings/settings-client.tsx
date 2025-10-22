"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type Role = "admin" | "operator" | "read_only";

type SettingsMap = Record<string, unknown>;

const stringify = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
};

const parseJson = (value: string, fallback: unknown) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export function SettingsClient({
  initialSettings,
  role
}: {
  initialSettings: SettingsMap;
  role: Role;
}) {
  const [dailyQuota, setDailyQuota] = useState(
    Number((initialSettings.daily_quota as { value?: number } | undefined)?.value ?? 40)
  );
  const [segmentFilters, setSegmentFilters] = useState(
    stringify(initialSettings.segment_filters ?? { industries: [], titles: [] })
  );
  const [cooldown, setCooldown] = useState(
    Number((initialSettings.company_cooldown_days as { value?: number } | undefined)?.value ?? 90)
  );
  const [skipRules, setSkipRules] = useState(
    stringify(initialSettings.skip_rules ?? { countries: [], keywords: [] })
  );
  const [allowedDomains, setAllowedDomains] = useState(
    Array.isArray(initialSettings.allowed_domains)
      ? (initialSettings.allowed_domains as string[]).join(", ")
      : "roboquill.io"
  );
  const [flash, setFlash] = useState<{ variant: "success" | "destructive"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [tests, setTests] = useState<{
    apollo?: { configured: boolean };
    hubspot?: { configured: boolean };
    postgres?: { connected: boolean };
  }>({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void runConnectivityTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isEditable = role === "admin";

  const save = async () => {
    if (!isEditable) return;
    setSaving(true);

    try {
      const segmentFiltersObject = parseJson(segmentFilters, null);
      const skipRulesObject = parseJson(skipRules, null);

      if (!segmentFiltersObject) {
        throw new Error("Segment filters JSON is invalid");
      }
      if (!skipRulesObject) {
        throw new Error("Skip rules JSON is invalid");
      }

      const updates = [
        { key: "daily_quota", value: { value: dailyQuota } },
        { key: "segment_filters", value: segmentFiltersObject },
        { key: "company_cooldown_days", value: { value: cooldown } },
        { key: "skip_rules", value: skipRulesObject },
        {
          key: "allowed_domains",
          value: allowedDomains
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
        }
      ];

      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      setFlash({ variant: "success", text: "Settings updated" });
    } catch (error) {
      console.error(error);
      setFlash({
        variant: "destructive",
        text: error instanceof Error ? error.message : "Failed to save settings"
      });
    } finally {
      setSaving(false);
    }
  };

  async function runConnectivityTests() {
    setTesting(true);
    try {
      const response = await fetch("/api/settings/test");
      if (!response.ok) {
        throw new Error("Unable to run connectivity tests");
      }
      const payload = (await response.json()) as typeof tests;
      setTests(payload);
    } catch (error) {
      console.error(error);
      setFlash({
        variant: "destructive",
        text: error instanceof Error ? error.message : "Connectivity test failed"
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      {flash ? (
        <Alert variant={flash.variant} onClick={() => setFlash(null)}>
          {flash.text}
        </Alert>
      ) : null}
      {!isEditable ? (
        <Alert variant="default">
          You have read-only access. Contact an administrator to change settings.
        </Alert>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3">
          <div>
            <Label htmlFor="dailyQuota">Daily quota</Label>
            <Input
              id="dailyQuota"
              type="number"
              min={1}
              value={dailyQuota}
              onChange={(event) => setDailyQuota(Number(event.target.value))}
              disabled={!isEditable}
            />
            <p className="text-xs text-slate-500">
              Maximum number of Apollo contacts to pull each weekday.
            </p>
          </div>

          <div>
            <Label htmlFor="cooldown">Company cool down (days)</Label>
            <Input
              id="cooldown"
              type="number"
              min={0}
              value={cooldown}
              onChange={(event) => setCooldown(Number(event.target.value))}
              disabled={!isEditable}
            />
          </div>

          <div>
            <Label htmlFor="allowedDomains">Allowed operator domains</Label>
            <Input
              id="allowedDomains"
              value={allowedDomains}
              onChange={(event) => setAllowedDomains(event.target.value)}
              placeholder="roboquill.io, example.com"
              disabled={!isEditable}
            />
            <p className="text-xs text-slate-500">
              Operators must sign in with one of these domains.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <Label htmlFor="segmentFilters">Segment filters (JSON)</Label>
            <Textarea
              id="segmentFilters"
              rows={8}
              value={segmentFilters}
              onChange={(event) => setSegmentFilters(event.target.value)}
              disabled={!isEditable}
            />
          </div>

          <div>
            <Label htmlFor="skipRules">Skip rules (JSON)</Label>
            <Textarea
              id="skipRules"
              rows={6}
              value={skipRules}
              onChange={(event) => setSkipRules(event.target.value)}
              disabled={!isEditable}
            />
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-x-2">
          <Button onClick={() => void runConnectivityTests()} variant="secondary" disabled={testing}>
            {testing ? "Testing..." : "Run connectivity tests"}
          </Button>
          {isEditable ? (
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <div className="flex items-center gap-1">
            <Badge variant={tests.apollo?.configured ? "secondary" : "outline"}>
              Apollo {tests.apollo?.configured ? "configured" : "missing"}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={tests.hubspot?.configured ? "secondary" : "outline"}>
              HubSpot {tests.hubspot?.configured ? "configured" : "missing"}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={tests.postgres?.connected ? "secondary" : "outline"}>
              Postgres {tests.postgres?.connected ? "ok" : "unreachable"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

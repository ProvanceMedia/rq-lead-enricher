import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { SettingsForm } from "@/components/settings/settings-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageSettings } from "@/lib/roles";
import { getServerEnv } from "@/lib/env";

const DEFAULT_SETTINGS = {
  dailyQuota: 40,
  segmentFilters: {},
  coolDownRules: {},
  skipRules: {},
  notificationTargets: {}
};

export default async function SettingsPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/sign-in");
  }

  if (!canManageSettings(session.user.role)) {
    redirect("/queue");
  }

  const existingSettings = await prisma.setting.findMany();

  const settingsMap = existingSettings.reduce<Record<string, unknown>>(
    (acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    },
    {}
  );

  const env = getServerEnv();

  return (
    <AppShell activePath="/settings" user={session.user}>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage outreach quotas, routing rules, and integration secrets.
          </p>
        </header>

        <SettingsForm
          settings={{
            dailyQuota: getNumberSetting(
              settingsMap["daily_quota"],
              DEFAULT_SETTINGS.dailyQuota
            ),
            segmentFilters: prettyJson(
              settingsMap["segment_filters"] ?? DEFAULT_SETTINGS.segmentFilters
            ),
            coolDownRules: prettyJson(
              settingsMap["cool_down_rules"] ?? DEFAULT_SETTINGS.coolDownRules
            ),
            skipRules: prettyJson(
              settingsMap["skip_rules"] ?? DEFAULT_SETTINGS.skipRules
            ),
            notificationTargets: prettyJson(
              settingsMap["notification_targets"] ??
                DEFAULT_SETTINGS.notificationTargets
            )
          }}
          envStatus={[
            {
              key: "APOLLO_API_KEY",
              label: "Apollo API Key",
              configured: Boolean(env.APOLLO_API_KEY)
            },
            {
              key: "HUBSPOT_PRIVATE_APP_TOKEN",
              label: "HubSpot Private App Token",
              configured: Boolean(env.HUBSPOT_PRIVATE_APP_TOKEN)
            },
            {
              key: "ANTHROPIC_API_KEY",
              label: "Anthropic API Key",
              configured: Boolean(env.ANTHROPIC_API_KEY)
            },
            {
              key: "FIRECRAWL_API_KEY",
              label: "Firecrawl API Key",
              configured: Boolean(env.FIRECRAWL_API_KEY)
            },
            {
              key: "SLACK_WEBHOOK_URL",
              label: "Slack Webhook URL",
              configured: Boolean(env.SLACK_WEBHOOK_URL)
            }
          ]}
        />
      </div>
    </AppShell>
  );
}

function prettyJson(value: unknown) {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return JSON.stringify(DEFAULT_SETTINGS.segmentFilters, null, 2);
  }
}

function getNumberSetting(value: unknown, fallback: number) {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : NaN;

  return Number.isFinite(num) ? num : fallback;
}

import { getServerEnv } from "@/lib/env";

const env = getServerEnv();

export async function postToSlack(text: string) {
  if (!env.SLACK_WEBHOOK_URL) {
    return;
  }

  const response = await fetch(env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack webhook failed (${response.status}): ${body}`);
  }
}

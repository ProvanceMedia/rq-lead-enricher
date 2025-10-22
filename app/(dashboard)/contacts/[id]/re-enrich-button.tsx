"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export function ReEnrichButton({
  contactId,
  disabled
}: {
  contactId: string;
  disabled: boolean;
}) {
  const [message, setMessage] = useState<{ variant: "success" | "destructive"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const reEnrich = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/contacts/${contactId}/re-enrich`, { method: "POST" });
      const payload = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.message ?? "Failed to queue re-enrichment");
      }
      setMessage({ variant: "success", text: "Re-enrichment requested. Check back shortly." });
    } catch (error) {
      console.error(error);
      setMessage({
        variant: "destructive",
        text: error instanceof Error ? error.message : "Failed to queue re-enrichment"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {message ? (
        <Alert variant={message.variant} onClick={() => setMessage(null)}>
          {message.text}
        </Alert>
      ) : null}
      <Button onClick={() => void reEnrich()} disabled={disabled || loading}>
        {loading ? "Requesting..." : "Re-enrich"}
      </Button>
    </div>
  );
}

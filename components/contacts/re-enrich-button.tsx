"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ReEnrichButtonProps {
  contactId: string;
  disabled?: boolean;
}

export function ReEnrichButton({ contactId, disabled }: ReEnrichButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    startTransition(async () => {
      const response = await fetch(`/api/contacts/${contactId}/re-enrich`, {
        method: "POST"
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error ?? "Failed to trigger re-enrichment");
        return;
      }

      router.refresh();
    });
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      disabled={disabled || pending}
    >
      <RotateCcw className="mr-2 h-4 w-4" />
      {pending ? "Re-enriching..." : "Re-enrich"}
    </Button>
  );
}

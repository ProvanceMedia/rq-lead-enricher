"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface ActivityFiltersProps {
  statuses: string[];
  users: Array<{ id: string; name: string | null; email: string }>;
  canExport: boolean;
  classifications: string[];
}

export function ActivityFilters({
  statuses,
  users,
  canExport,
  classifications
}: ActivityFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exporting, setExporting] = useState(false);

  const handleChange = useCallback(
    (name: string, rawValue: string | null) => {
      const value = rawValue && rawValue.length > 0 ? rawValue : null;
      const params = new URLSearchParams(searchParams ?? undefined);

      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }

      const query = params.toString();
      router.push(query ? `/activity?${query}` : "/activity");
    },
    [router, searchParams]
  );

  async function handleExport() {
    setExporting(true);
    const params = searchParams?.toString() ?? "";
    const response = await fetch(`/api/events?${params}`);
    const data = (await response.json()) as { events: unknown[] };

    const headers = ["timestamp", "type", "contact", "enrichment", "details"];
    const rows = (data.events ?? []) as Array<{
      createdAt: string;
      type: string;
      contact?: { email?: string | null; company?: string | null };
      enrichment?: { classification?: string | null };
      payload?: Record<string, unknown>;
    }>;

    const csvLines = [
      headers.join(","),
      ...rows.map((row) =>
        [
          row.createdAt,
          row.type,
          row.contact?.email ?? "",
          row.enrichment?.classification ?? "",
          JSON.stringify(row.payload ?? {})
        ]
          .map((value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([csvLines], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `roboquill-activity-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col">
        <label className="text-xs font-medium text-muted-foreground">
          Status
        </label>
        <Select
          onValueChange={(value) => handleChange("status", value)}
          value={searchParams?.get("status") ?? undefined}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-medium text-muted-foreground">
          User
        </label>
        <Select
          onValueChange={(value) => handleChange("userId", value)}
          value={searchParams?.get("userId") ?? undefined}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All users</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name ?? user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-medium text-muted-foreground">
          Segment
        </label>
        <Select
          onValueChange={(value) => handleChange("classification", value)}
          value={searchParams?.get("classification") ?? undefined}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All segments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All segments</SelectItem>
            {classifications.map((classification) => (
              <SelectItem key={classification} value={classification}>
                {classification}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col">
        <label className="text-xs font-medium text-muted-foreground">
          From date
        </label>
        <Input
          type="date"
          value={searchParams?.get("from") ?? ""}
          onChange={(event) =>
            handleChange("from", event.target.value || null)
          }
          className="w-[170px]"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium text-muted-foreground">
          To date
        </label>
        <Input
          type="date"
          value={searchParams?.get("to") ?? ""}
          onChange={(event) => handleChange("to", event.target.value || null)}
          className="w-[170px]"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {canExport ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

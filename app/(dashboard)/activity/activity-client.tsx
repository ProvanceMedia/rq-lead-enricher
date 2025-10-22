"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type ActivityItem = {
  event: {
    id: string;
    type: string;
    createdAt: string | null;
    payload: unknown;
  };
  contact: {
    id: string;
    email: string;
    company: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  enrichment: {
    id: string;
    status: string;
  } | null;
};

const EVENT_TYPES = [
  "pulled_from_apollo",
  "deduped",
  "enriched",
  "approval_requested",
  "approved",
  "rejected",
  "hubspot_updated",
  "failed",
  "re_enrich_requested"
] as const;

type Filters = {
  type: string;
  from: string;
  to: string;
  user: string;
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London"
  }).format(new Date(value));
};

const stringifyPayload = (payload: unknown) => {
  if (!payload) return "";
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
};

export function ActivityClient({ initialData }: { initialData: ActivityItem[] }) {
  const [data, setData] = useState<ActivityItem[]>(initialData);
  const [filters, setFilters] = useState<Filters>({
    type: "",
    from: "",
    to: "",
    user: ""
  });
  const [message, setMessage] = useState<{ variant: "destructive" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFilterChange = (partial: Partial<Filters>) =>
    setFilters((prev) => ({ ...prev, ...partial }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.type) params.append("type", filters.type);
    if (filters.from) params.append("from", filters.from);
    if (filters.to) params.append("to", filters.to);

    try {
      const response = await fetch(`/api/activity?${params.toString()}`, { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to load activity");
      }
      const payload = (await response.json()) as {
        data: ActivityItem[];
      };
      setData(payload.data);
    } catch (error) {
      console.error(error);
      setMessage({ text: "Could not refresh activity. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filters.from, filters.to, filters.type]);

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type, filters.from, filters.to]);

  const filteredData = useMemo(() => {
    if (!filters.user) return data;
    const needle = filters.user.toLowerCase();
    return data.filter((item) => {
      const payloadString = stringifyPayload(item.event.payload).toLowerCase();
      return payloadString.includes(needle);
    });
  }, [data, filters.user]);

  const downloadCsv = () => {
    const headers = ["Event ID", "Type", "Timestamp", "Contact", "Company", "Payload"];
    const rows = filteredData.map((item) => [
      item.event.id,
      item.event.type,
      formatDate(item.event.createdAt),
      item.contact
        ? [item.contact.firstName, item.contact.lastName].filter(Boolean).join(" ") ||
          item.contact.email
        : "",
      item.contact?.company ?? "",
      stringifyPayload(item.event.payload).replace(/\n/g, " ")
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `activity-${Date.now()}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {message ? (
        <Alert variant={message.variant} onClick={() => setMessage(null)}>
          {message.text}
        </Alert>
      ) : null}

      <div className="grid gap-3 md:grid-cols-5">
        <div>
          <Label htmlFor="type">Event type</Label>
          <Select
            id="type"
            value={filters.type}
            onChange={(event) => handleFilterChange({ type: event.target.value })}
          >
            <option value="">All events</option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="from">From</Label>
          <Input
            id="from"
            type="date"
            value={filters.from}
            onChange={(event) => handleFilterChange({ from: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            value={filters.to}
            onChange={(event) => handleFilterChange({ to: event.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="user">User or payload search</Label>
          <Input
            id="user"
            placeholder="Search payload for user email or id"
            value={filters.user}
            onChange={(event) => handleFilterChange({ user: event.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={() => void fetchData()} disabled={loading}>
          Refresh
        </Button>
        <Button onClick={downloadCsv} disabled={filteredData.length === 0}>
          Export CSV
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Payload</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex h-24 items-center justify-center text-sm text-slate-500">
                    {loading ? "Loading activity..." : "No events"}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.event.id}>
                  <TableCell className="text-sm text-slate-600">
                    {formatDate(item.event.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{item.event.type}</TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-700">
                      {item.contact
                        ? [item.contact.firstName, item.contact.lastName].filter(Boolean).join(" ") ||
                          item.contact.email
                        : "—"}
                    </div>
                    <div className="text-xs text-slate-500">{item.contact?.email ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {item.contact?.company ?? "—"}
                  </TableCell>
                  <TableCell>
                    <pre className="max-h-32 overflow-auto text-xs text-slate-500">
                      {stringifyPayload(item.event.payload)}
                    </pre>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

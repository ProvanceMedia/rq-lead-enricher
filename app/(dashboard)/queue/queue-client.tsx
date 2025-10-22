"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Role = "admin" | "operator" | "read_only";

type SerializableEnrichment = {
  id: string;
  status: string;
  classification: string | null;
  approvalBlock: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  psLine: string | null;
  psSourceUrl: string | null;
  addressSourceUrl: string | null;
  createdAt: string | null;
};

type SerializableContact = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  domain: string | null;
  createdAt: string | null;
};

export type QueueItem = {
  enrichment: SerializableEnrichment;
  contact: SerializableContact;
};

type Filters = {
  status: string;
  classification: string;
  q: string;
  from: string;
  to: string;
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London"
  }).format(new Date(value));
};

const fallbackApprovalBlock = (item: QueueItem) => {
  const { contact, enrichment } = item;
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return `CONTACT: ${name || contact.email} at ${contact.company ?? "Unknown"}
ADDRESS FOUND: ${(enrichment.addressLine1 ?? "")} ${(enrichment.city ?? "")} ${enrichment.postcode ?? ""} ${enrichment.country ?? ""}`.trim();
};

export function QueueClient({
  initialData,
  initialFilters,
  role
}: {
  initialData: QueueItem[];
  initialFilters: Filters;
  role: Role;
}) {
  const [data, setData] = useState<QueueItem[]>(initialData);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: "success" | "destructive" | "default" } | null>(null);
  const [dialogItem, setDialogItem] = useState<QueueItem | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const canMutate = role === "admin" || role === "operator";

  const classifications = useMemo(() => {
    const unique = new Set<string>();
    data.forEach((item) => {
      if (item.enrichment.classification) {
        unique.add(item.enrichment.classification);
      }
    });
    return Array.from(unique);
  }, [data]);

  const fetchData = useCallback(async (activeFilters: Filters) => {
    setIsLoading(true);

    const params = new URLSearchParams();
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        params.append(key === "q" ? "q" : key, value);
      }
    });

    try {
      const response = await fetch(`/api/enrichments/awaiting?${params.toString()}`, {
        method: "GET"
      });
      if (!response.ok) {
        throw new Error("Failed to load queue");
      }
      const payload = (await response.json()) as { data: QueueItem[] };
      setData(
        payload.data.map((item) => ({
          enrichment: item.enrichment,
          contact: item.contact
        }))
      );
    } catch (error) {
      console.error(error);
      setMessage({ text: "Could not refresh queue. Try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(filters);
  }, [fetchData, filters]);

  const updateFilters = (partial: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  const mutate = async (id: string, action: "approve" | "reject", payload?: { reason?: string }) => {
    setPendingId(id);
    try {
      const response = await fetch(`/api/enrichments/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined
      });
      const result = (await response.json()) as { success?: boolean; message?: string };

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Action failed");
      }

      setData((prev) => prev.filter((item) => item.enrichment.id !== id));
      setMessage({
        text: action === "approve" ? "Enrichment approved and synced." : "Enrichment rejected.",
        variant: "success"
      });
    } catch (error) {
      console.error(error);
      setMessage({
        text: error instanceof Error ? error.message : "Action failed",
        variant: "destructive"
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleApprove = (id: string) => mutate(id, "approve");

  const handleReject = (id: string) => {
    const reason = window.prompt("Optional reason for rejection");
    mutate(id, "reject", { reason: reason ?? "" });
  };

  const activeItem = dialogItem;

  return (
    <div className="space-y-4">
      {message ? (
        <Alert variant={message.variant} onClick={() => setMessage(null)}>
          {message.text}
        </Alert>
      ) : null}

      <div className="grid gap-3 md:grid-cols-5">
        <div className="md:col-span-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Email, name, company, P.S."
            value={filters.q}
            onChange={(event) => updateFilters({ q: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={filters.status}
            onChange={(event) => updateFilters({ status: event.target.value })}
          >
            <option value="awaiting_approval">Awaiting approval</option>
            <option value="approved">Approved</option>
            <option value="updated">Synced to HubSpot</option>
            <option value="rejected">Rejected</option>
            <option value="error">Errored</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="classification">Classification</Label>
          <Select
            id="classification"
            value={filters.classification}
            onChange={(event) => updateFilters({ classification: event.target.value })}
          >
            <option value="">All</option>
            {classifications.map((item) => (
              <option key={item} value={item}>
                {item}
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
            onChange={(event) => updateFilters({ from: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="date"
            value={filters.to}
            onChange={(event) => updateFilters({ to: event.target.value })}
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Address preview</TableHead>
              <TableHead>P.S.</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex h-24 items-center justify-center text-sm text-slate-500">
                    {isLoading ? "Loading queue..." : "No results."}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item.enrichment.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <Link
                        href={`/contacts/${item.contact.id}`}
                        className="font-medium text-slate-900 underline-offset-4 hover:underline"
                      >
                        {[item.contact.firstName, item.contact.lastName].filter(Boolean).join(" ") ||
                          item.contact.email}
                      </Link>
                      <span className="text-xs text-slate-500">{item.contact.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{item.contact.company ?? "—"}</span>
                      <span className="text-xs text-slate-500">{item.contact.domain}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.enrichment.classification ? (
                      <Badge variant="secondary">{item.enrichment.classification}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-sm text-slate-600">
                      {[item.enrichment.addressLine1, item.enrichment.city, item.enrichment.postcode]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-slate-600">
                    {item.enrichment.psLine ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {formatDate(item.enrichment.createdAt)}
                  </TableCell>
                  <TableCell className="space-y-1 text-right">
                    <Dialog
                      onOpenChange={(open) => {
                        if (open) {
                          setDialogItem(item);
                        } else {
                          setDialogItem(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[80vh] overflow-y-auto">
                        {activeItem ? (
                          <>
                            <DialogHeader>
                              <DialogTitle>Approval block</DialogTitle>
                              <DialogDescription>
                                Review the enrichment details before taking action.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 p-6 pt-0">
                              <section>
                                <h4 className="text-sm font-semibold text-slate-700">Contact</h4>
                                <p className="text-sm text-slate-600">
                                  {[activeItem.contact.firstName, activeItem.contact.lastName]
                                    .filter(Boolean)
                                    .join(" ") || activeItem.contact.email}
                                </p>
                                <p className="text-xs text-slate-500">{activeItem.contact.email}</p>
                              </section>
                              <section>
                                <h4 className="text-sm font-semibold text-slate-700">Approval block</h4>
                                <pre className="whitespace-pre-wrap rounded-md bg-slate-100 p-3 text-xs text-slate-700">
                                  {activeItem.enrichment.approvalBlock ??
                                    fallbackApprovalBlock(activeItem)}
                                </pre>
                              </section>
                              <section className="grid gap-2 text-sm text-slate-600">
                                <p>
                                  <span className="font-semibold text-slate-700">P.S. line:</span>{" "}
                                  {activeItem.enrichment.psLine ?? "—"}
                                </p>
                                {activeItem.enrichment.psSourceUrl ? (
                                  <p>
                                    <span className="font-semibold text-slate-700">P.S. source:</span>{" "}
                                    <a
                                      href={activeItem.enrichment.psSourceUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-slate-900 underline"
                                    >
                                      Source link
                                    </a>
                                  </p>
                                ) : null}
                                {activeItem.enrichment.addressSourceUrl ? (
                                  <p>
                                    <span className="font-semibold text-slate-700">Address source:</span>{" "}
                                    <a
                                      href={activeItem.enrichment.addressSourceUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-slate-900 underline"
                                    >
                                      View source
                                    </a>
                                  </p>
                                ) : null}
                              </section>
                              <section>
                                <h4 className="text-sm font-semibold text-slate-700">HubSpot mapping preview</h4>
                                <dl className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                                  <dt className="font-medium text-slate-700">Address</dt>
                                  <dd>{activeItem.contact.company ?? "—"}</dd>
                                  <dt className="font-medium text-slate-700">Line 2</dt>
                                  <dd>{activeItem.enrichment.addressLine1 ?? "—"}</dd>
                                  <dt className="font-medium text-slate-700">Line 3</dt>
                                  <dd>{activeItem.enrichment.addressLine2 ?? "—"}</dd>
                                  <dt className="font-medium text-slate-700">City</dt>
                                  <dd>{activeItem.enrichment.city ?? "—"}</dd>
                                  <dt className="font-medium text-slate-700">Postcode</dt>
                                  <dd>{activeItem.enrichment.postcode ?? "—"}</dd>
                                  <dt className="font-medium text-slate-700">Country</dt>
                                  <dd>{activeItem.enrichment.country ?? "—"}</dd>
                                  <dt className="font-medium text-slate-700">Company type</dt>
                                  <dd>{activeItem.enrichment.classification ?? "—"}</dd>
                                  <dt className="font-medium text-slate-700">P.S. line</dt>
                                  <dd>{activeItem.enrichment.psLine ?? "—"}</dd>
                                </dl>
                              </section>
                            </div>
                            <DialogFooter>
                              <div className="flex w-full justify-end gap-2">
                                {canMutate && activeItem.enrichment.status === "awaiting_approval" ? (
                                  <>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleReject(activeItem.enrichment.id)}
                                      disabled={pendingId === activeItem.enrichment.id}
                                    >
                                      Reject
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleApprove(activeItem.enrichment.id)}
                                      disabled={pendingId === activeItem.enrichment.id}
                                    >
                                      Approve
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-sm text-slate-500">
                                    {canMutate
                                      ? "Actions available only for awaiting approvals."
                                      : "Read only access"}
                                  </span>
                                )}
                              </div>
                            </DialogFooter>
                          </>
                        ) : null}
                      </DialogContent>
                    </Dialog>
                    {canMutate && item.enrichment.status === "awaiting_approval" ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleApprove(item.enrichment.id)}
                          disabled={pendingId === item.enrichment.id}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(item.enrichment.id)}
                          disabled={pendingId === item.enrichment.id}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">No actions</span>
                    )}
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

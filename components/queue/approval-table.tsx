"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  ExternalLink
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ApprovalItem {
  id: string;
  createdAt: string;
  approvalBlock?: string | null;
  classification?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  psLine?: string | null;
  psSourceUrl?: string | null;
  addressSourceUrl?: string | null;
  contact: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    domain?: string | null;
  };
}

interface ApprovalTableProps {
  enrichments: ApprovalItem[];
  canApprove: boolean;
}

export function ApprovalTable({ enrichments, canApprove }: ApprovalTableProps) {
  const [approvePending, startApprove] = useTransition();
  const [rejectPending, startReject] = useTransition();
  const router = useRouter();

  async function approve(id: string) {
    if (!canApprove) return;

    startApprove(async () => {
      const response = await fetch(`/api/enrichments/${id}/approve`, {
        method: "POST"
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error ?? "Failed to approve enrichment");
        return;
      }

      router.refresh();
    });
  }

  async function reject(id: string) {
    if (!canApprove) return;

    const reason = window.prompt("Add an optional rejection reason");

    startReject(async () => {
      const response = await fetch(`/api/enrichments/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(data.error ?? "Failed to reject enrichment");
        return;
      }

      router.refresh();
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contact</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Classification</TableHead>
            <TableHead>Address Preview</TableHead>
            <TableHead>P.S. Line</TableHead>
            <TableHead>Source Links</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrichments.map((enrichment) => {
            const created = new Date(enrichment.createdAt).toLocaleString();
            const addressPreview = [
              enrichment.addressLine1,
              enrichment.addressLine2,
              [enrichment.city, enrichment.postcode]
                .filter(Boolean)
                .join(", ")
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <TableRow key={enrichment.id}>
                <TableCell className="min-w-[200px]">
                  <Link
                    href={`/contacts/${enrichment.contact.id}`}
                    className="flex flex-col hover:underline"
                  >
                    <span className="font-semibold">
                      {enrichment.contact.firstName} {enrichment.contact.lastName}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {enrichment.contact.email}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="min-w-[160px]">
                  <div className="flex flex-col">
                    <span>{enrichment.contact.company}</span>
                    {enrichment.contact.domain ? (
                      <a
                        href={`https://${enrichment.contact.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        {enrichment.contact.domain}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {enrichment.classification ?? "Pending"}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[220px]">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      {addressPreview || "—"}
                      <span className="text-xs text-muted-foreground">
                        {enrichment.country}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] text-sm">
                  {enrichment.psLine ?? "—"}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex flex-col gap-1">
                    {enrichment.addressSourceUrl ? (
                      <a
                        href={enrichment.addressSourceUrl}
                        className="text-xs text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Address source
                      </a>
                    ) : null}
                    {enrichment.psSourceUrl ? (
                      <a
                        href={enrichment.psSourceUrl}
                        className="text-xs text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        P.S. source
                      </a>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {created}
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Approval details</DialogTitle>
                        <DialogDescription>
                          Comprehensive enrichment details for{" "}
                          {enrichment.contact.firstName}{" "}
                          {enrichment.contact.lastName}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <section>
                          <h4 className="text-sm font-semibold uppercase text-muted-foreground">
                            Approval Block
                          </h4>
                          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/60 p-4 text-sm">
                            {enrichment.approvalBlock ?? "No approval block"}
                          </pre>
                        </section>
                        <section className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-muted-foreground">
                              Address line 1
                            </p>
                            <p>{enrichment.addressLine1 ?? "—"}</p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">
                              Address line 2
                            </p>
                            <p>{enrichment.addressLine2 ?? "—"}</p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">
                              City
                            </p>
                            <p>{enrichment.city ?? "—"}</p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">
                              Postcode
                            </p>
                            <p>{enrichment.postcode ?? "—"}</p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">
                              Country
                            </p>
                            <p>{enrichment.country ?? "—"}</p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">
                              Classification
                            </p>
                            <p>{enrichment.classification ?? "—"}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="font-medium text-muted-foreground">
                              P.S. line
                            </p>
                            <p>{enrichment.psLine ?? "—"}</p>
                          </div>
                        </section>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {canApprove ? (
                    <>
                      <Button
                        size="sm"
                        className={cn(
                          approvePending && "pointer-events-none opacity-70"
                        )}
                        onClick={() => approve(enrichment.id)}
                        disabled={approvePending || rejectPending}
                      >
                        <ThumbsUp className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className={cn(
                          rejectPending && "pointer-events-none opacity-70"
                        )}
                        onClick={() => reject(enrichment.id)}
                        disabled={approvePending || rejectPending}
                      >
                        <ThumbsDown className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {enrichments.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No enrichments awaiting approval.
        </p>
      ) : null}
    </>
  );
}

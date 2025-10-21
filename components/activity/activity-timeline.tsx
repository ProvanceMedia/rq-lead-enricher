import { CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface ActivityEvent {
  id: string;
  createdAt: string;
  type: string;
  payload?: Record<string, unknown> | null;
  contact?: {
    id: string;
    email?: string | null;
    company?: string | null;
  } | null;
  enrichment?: {
    id: string;
    classification?: string | null;
    status: string;
  } | null;
}

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

const typeColors: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  enriched: "bg-blue-100 text-blue-700",
  approval_requested: "bg-amber-100 text-amber-700",
  queued_for_update: "bg-indigo-100 text-indigo-700",
  hubspot_updated: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  pulled_from_apollo: "bg-slate-100 text-slate-700",
  deduped: "bg-slate-100 text-slate-700"
};

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border bg-background py-16 text-muted-foreground">
        <CalendarClock className="h-10 w-10" />
        <p className="mt-3 text-sm">No events found for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const timestamp = new Date(event.createdAt).toLocaleString();

        return (
          <div key={event.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "mt-[0.4rem] h-2 w-2 rounded-full border border-muted-foreground",
                  typeColors[event.type] ?? "bg-muted"
                )}
              />
              {index !== events.length - 1 ? (
                <span className="mt-2 h-full w-px bg-border" />
              ) : null}
            </div>
            <Card className="flex-1">
              <CardContent className="grid gap-2 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    className={cn(
                      "capitalize",
                      typeColors[event.type] ?? "bg-slate-100 text-slate-700"
                    )}
                  >
                    {event.type.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{timestamp}</span>
                  {event.enrichment?.classification ? (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-xs text-muted-foreground">
                        Segment: {event.enrichment.classification}
                      </span>
                    </>
                  ) : null}
                </div>

                {event.contact ? (
                  <div className="text-sm">
                    <span className="font-medium">{event.contact.company}</span>{" "}
                    <span className="text-muted-foreground">({event.contact.email})</span>
                  </div>
                ) : null}

                {event.payload ? (
                  <pre className="max-h-48 overflow-auto rounded bg-muted/40 p-3 text-xs">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                ) : null}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

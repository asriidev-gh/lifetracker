"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ActivityRecord } from "@/types/activity";

const PRODUCTIVITY_TAGS = ["coding", "meetings", "learning", "side-project", "debugging"] as const;

export function ProductivitySummary({
  activities,
  title = "Productivity today",
}: {
  activities: ActivityRecord[];
  title?: string;
}) {
  const byTag = activities.reduce<Record<string, number>>((acc, a) => {
    for (const tag of a.tags ?? []) {
      const t = tag.toLowerCase();
      if (PRODUCTIVITY_TAGS.includes(t as (typeof PRODUCTIVITY_TAGS)[number])) {
        acc[t] = (acc[t] ?? 0) + (a.duration ?? 0);
      }
    }
    return acc;
  }, {});

  const codingHours = (byTag.coding ?? 0) + (byTag["side-project"] ?? 0) + (byTag.debugging ?? 0);
  const meetingHours = byTag.meetings ?? 0;
  const learningHours = byTag.learning ?? 0;

  if (codingHours === 0 && meetingHours === 0 && learningHours === 0) {
    return null;
  }

  return (
    <Card
      className={cn(
        "border-dashboard-list-border bg-gradient-to-br from-dashboard-list via-card to-[hsl(var(--chart-3)_/_0.12)]",
        "shadow-md ring-1 ring-[hsl(var(--chart-3)_/_0.18)]"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Coding, meetings, learning (from tags)
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Coding</p>
            <p className="text-xl font-semibold tabular-nums text-[hsl(var(--chart-1))]">
              {codingHours.toFixed(1)}h
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Meetings</p>
            <p className="text-xl font-semibold tabular-nums text-[hsl(var(--chart-4))]">
              {meetingHours.toFixed(1)}h
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">Learning</p>
            <p className="text-xl font-semibold tabular-nums text-[hsl(var(--chart-2))]">
              {learningHours.toFixed(1)}h
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

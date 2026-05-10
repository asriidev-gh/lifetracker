"use client";

import { useMemo } from "react";
import { format, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ActivityRecord } from "@/types/activity";
import { Check, X } from "lucide-react";

const LIFE_PILLARS = [
  { key: "Exercise", categories: ["Sports"], label: "Exercise" },
  { key: "Work", categories: ["Work"], label: "Work" },
  { key: "Social", categories: ["Social"], label: "Social" },
  { key: "Spiritual", categories: ["Church", "Spiritual"], label: "Spiritual" },
  { key: "Family", categories: ["Family"], label: "Family" },
  { key: "Personal", categories: ["Personal", "Learning"], label: "Personal growth" },
] as const;

export function LifeScoreCard({
  activities,
  balanceDescription = "Balance across life pillars today",
}: {
  activities: ActivityRecord[];
  balanceDescription?: string;
}) {
  const activitiesThroughToday = useMemo(() => {
    const todayKey = format(startOfDay(new Date()), "yyyy-MM-dd");
    return activities.filter((a) => a.date.slice(0, 10) <= todayKey);
  }, [activities]);

  const hoursByCategory = activitiesThroughToday.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + (a.duration ?? 0);
    return acc;
  }, {});

  const pillarStatus = LIFE_PILLARS.map((p) => {
    const hours = p.categories.reduce((sum, c) => sum + (hoursByCategory[c] ?? 0), 0);
    return { ...p, met: hours > 0 };
  });

  const metCount = pillarStatus.filter((p) => p.met).length;
  const score = LIFE_PILLARS.length
    ? Math.round((metCount / LIFE_PILLARS.length) * 100)
    : 0;

  return (
    <Card
      className={cn(
        "border-dashboard-list-border bg-gradient-to-br from-dashboard-list via-card to-primary/[0.07]",
        "shadow-md ring-1 ring-primary/[0.08]"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Life Score</CardTitle>
        <p className="text-xs text-muted-foreground">{balanceDescription}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/15 text-2xl font-bold text-primary shadow-inner">
            {score}%
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {pillarStatus.map((p) => (
              <div key={p.key} className="flex items-center gap-2">
                {p.met ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={p.met ? "" : "text-muted-foreground"}>
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

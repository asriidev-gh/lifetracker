"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityRecord } from "@/types/activity";
import { Check, X } from "lucide-react";

const LIFE_PILLARS = [
  { key: "Exercise", categories: ["Sports"], label: "Exercise" },
  { key: "Work", categories: ["Work"], label: "Work" },
  { key: "Social", categories: ["Social"], label: "Social" },
  { key: "Spiritual", categories: ["Church"], label: "Spiritual" },
  { key: "Family", categories: ["Family"], label: "Family" },
  { key: "Personal", categories: ["Personal", "Learning"], label: "Personal growth" },
] as const;

export function LifeScoreCard({ activities }: { activities: ActivityRecord[] }) {
  const hoursByCategory = activities.reduce<Record<string, number>>((acc, a) => {
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Life Score</CardTitle>
        <p className="text-xs text-muted-foreground">
          Balance across life pillars today
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
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

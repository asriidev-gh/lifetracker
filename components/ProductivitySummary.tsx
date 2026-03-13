"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityRecord } from "@/types/activity";

const PRODUCTIVITY_TAGS = ["coding", "meetings", "learning", "side-project", "debugging"] as const;

export function ProductivitySummary({ activities }: { activities: ActivityRecord[] }) {
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Productivity today</CardTitle>
        <p className="text-xs text-muted-foreground">
          Coding, meetings, learning (from tags)
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Coding</p>
            <p className="text-xl font-semibold">{codingHours.toFixed(1)}h</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Meetings</p>
            <p className="text-xl font-semibold">{meetingHours.toFixed(1)}h</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Learning</p>
            <p className="text-xl font-semibold">{learningHours.toFixed(1)}h</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect } from "react";
import { format, startOfWeek, subWeeks, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const WEEKS = 12;

export function HeatmapView() {
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const end = new Date();
    const start = subWeeks(end, WEEKS);
    fetch(
      `/api/activities?dateFrom=${format(start, "yyyy-MM-dd")}&dateTo=${format(end, "yyyy-MM-dd")}`
    )
      .then((res) => res.json())
      .then((activities: { date: string; duration?: number }[]) => {
        const byDay: Record<string, number> = {};
        for (const a of activities) {
          const d = a.date.slice(0, 10);
          byDay[d] = (byDay[d] ?? 0) + (a.duration ?? 0);
        }
        setData(byDay);
      })
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const end = new Date();
  const maxHours = Math.max(1, ...Object.values(data));

  const getLevel = (hours: number) => {
    if (hours <= 0) return 0;
    const ratio = hours / maxHours;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  const weekStarts: Date[] = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    weekStarts.push(startOfWeek(subWeeks(end, i), { weekStartsOn: 1 }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contribution-style heatmap</CardTitle>
        <p className="text-sm text-muted-foreground">
          Darker = more hours logged that day
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-flex gap-1">
            <div className="flex flex-col justify-around gap-1 text-xs text-muted-foreground">
              {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((label, i) => (
                <div key={i} className="flex h-4 items-center">
                  {label}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => (
                <div key={dayOffset} className="flex gap-1">
                  {weekStarts.map((ws) => {
                    const d = addDays(ws, dayOffset);
                    const key = format(d, "yyyy-MM-dd");
                    const hours = data[key] ?? 0;
                    const level = getLevel(hours);
                    return (
                      <div
                        key={key}
                        className="h-4 w-4 shrink-0 rounded-sm border border-border"
                        style={{
                          backgroundColor:
                            level === 0
                              ? "hsl(var(--muted))"
                              : level === 1
                                ? "hsl(var(--primary) / 0.25)"
                                : level === 2
                                  ? "hsl(var(--primary) / 0.5)"
                                  : level === 3
                                    ? "hsl(var(--primary) / 0.75)"
                                    : "hsl(var(--primary))",
                        }}
                        title={`${key}: ${hours.toFixed(1)}h`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className="h-4 w-4 rounded-sm border border-border"
              style={{
                backgroundColor:
                  level === 0
                    ? "hsl(var(--muted))"
                    : level === 1
                      ? "hsl(var(--primary) / 0.25)"
                      : level === 2
                        ? "hsl(var(--primary) / 0.5)"
                        : level === 3
                          ? "hsl(var(--primary) / 0.75)"
                          : "hsl(var(--primary))",
              }}
            />
          ))}
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}

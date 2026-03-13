"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityRecord } from "@/types/activity";

interface DashboardCardsProps {
  totalHoursToday: number;
  todayActivities: ActivityRecord[];
}

export function DashboardCards({
  totalHoursToday,
  todayActivities,
}: DashboardCardsProps) {
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total hours today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalHoursToday.toFixed(1)}h</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Activities today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayActivities.length}</div>
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Today&apos;s activities</CardTitle>
        </CardHeader>
        <CardContent>
          {todayActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activities logged yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {todayActivities.map((a) => (
                <li key={String(a._id)} className="flex justify-between">
                  <span>{a.title}</span>
                  <span className="text-muted-foreground">
                    {a.startTime} – {a.endTime} ({a.duration}h)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}

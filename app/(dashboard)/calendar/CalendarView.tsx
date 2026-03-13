"use client";

import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  addDays,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ActivityRecord } from "@/types/activity";

export function CalendarView() {
  const [current, setCurrent] = useState(new Date());
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const start = startOfWeek(monthStart);
  const end = endOfWeek(monthEnd);

  useEffect(() => {
    const from = format(start, "yyyy-MM-dd");
    const to = format(end, "yyyy-MM-dd");
    fetch(`/api/activities?dateFrom=${from}&dateTo=${to}`)
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setActivities(data) : setActivities([])))
      .catch(() => setActivities([]));
  }, [current, start, end]);

  const days: Date[] = [];
  let day = start;
  while (day <= end) {
    days.push(day);
    day = addDays(day, 1);
  }

  const activitiesByDate = activities.reduce<Record<string, ActivityRecord[]>>(
    (acc, a) => {
      const d = a.date.slice(0, 10);
      if (!acc[d]) acc[d] = [];
      acc[d].push(a);
      return acc;
    },
    {}
  );

  const selectedActivities = selectedDate
    ? activitiesByDate[selectedDate] ?? []
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{format(current, "MMMM yyyy")}</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrent(subMonths(current, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrent(addMonths(current, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const dayActivities = activitiesByDate[key] ?? [];
              const isCurrentMonth = isSameMonth(d, current);
              const isSelected = selectedDate === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={`
                    min-h-[80px] rounded-md border p-2 text-left text-sm transition-colors
                    ${!isCurrentMonth ? "bg-muted/50 text-muted-foreground" : "bg-card"}
                    ${isSelected ? "ring-2 ring-primary" : "hover:bg-muted/50"}
                  `}
                >
                  <span className="font-medium">{format(d, "d")}</span>
                  {dayActivities.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayActivities.slice(0, 2).map((a) => (
                        <div
                          key={a._id}
                          className="truncate rounded bg-primary/20 px-1 text-xs"
                          title={a.title}
                        >
                          {a.title}
                        </div>
                      ))}
                      {dayActivities.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayActivities.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>Activities on {selectedDate}</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activities on this day.
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedActivities.map((a) => (
                  <li
                    key={a._id}
                    className="flex justify-between rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-muted-foreground">
                        {a.category} · {a.startTime} – {a.endTime} ({a.duration}h)
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

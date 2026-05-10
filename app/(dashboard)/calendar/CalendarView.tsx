"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  isToday,
} from "date-fns";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, CalendarPlus, Pencil } from "lucide-react";
import { ActivityRecord } from "@/types/activity";
import type { CalendarMarkRecord } from "@/types/calendarMark";
import { cn } from "@/lib/utils";
import { getMarkChipClass } from "@/lib/calendarMarkColors";
import { MarkRecurringEventsDialog } from "./MarkRecurringEventsDialog";
import { EditCalendarMarkDialog } from "./EditCalendarMarkDialog";

const CATEGORY_COLOR_STYLES: Record<string, string> = {
  Sports: "bg-green-500/20 text-green-800 dark:text-green-200",
  Work: "bg-blue-500/20 text-blue-800 dark:text-blue-200",
  Social: "bg-pink-500/20 text-pink-800 dark:text-pink-200",
  Church: "bg-violet-500/20 text-violet-800 dark:text-violet-200",
  Spiritual: "bg-purple-500/20 text-purple-800 dark:text-purple-200",
  Finance: "bg-amber-500/20 text-amber-800 dark:text-amber-200",
  Family: "bg-rose-500/20 text-rose-800 dark:text-rose-200",
  Personal: "bg-cyan-500/20 text-cyan-800 dark:text-cyan-200",
  Learning: "bg-indigo-500/20 text-indigo-800 dark:text-indigo-200",
};

function getCategoryColor(category: string) {
  return CATEGORY_COLOR_STYLES[category] ?? "bg-primary/20 text-foreground";
}

export function CalendarView() {
  const [current, setCurrent] = useState(new Date());
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [marks, setMarks] = useState<CalendarMarkRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [markDialogOpen, setMarkDialogOpen] = useState(false);
  const [editingMark, setEditingMark] = useState<CalendarMarkRecord | null>(null);

  const { start, end, from, to } = useMemo(() => {
    const monthStart = startOfMonth(current);
    const monthEnd = endOfMonth(current);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    return {
      start,
      end,
      from: format(start, "yyyy-MM-dd"),
      to: format(end, "yyyy-MM-dd"),
    };
  }, [current]);

  const loadCalendarData = useCallback(() => {
    const q = `dateFrom=${encodeURIComponent(from)}&dateTo=${encodeURIComponent(to)}`;
    fetch(`/api/activities?${q}`)
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setActivities(data) : setActivities([])))
      .catch(() => setActivities([]));
    fetch(`/api/calendar-marks?${q}`)
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setMarks(data as CalendarMarkRecord[]) : setMarks([])))
      .catch(() => setMarks([]));
  }, [from, to]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

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

  const marksByDate = marks.reduce<Record<string, CalendarMarkRecord[]>>((acc, m) => {
    const d = m.date.slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(m);
    return acc;
  }, {});

  const selectedActivities = selectedDate
    ? activitiesByDate[selectedDate] ?? []
    : [];

  const selectedMarks = selectedDate ? marksByDate[selectedDate] ?? [] : [];

  function dayChips(key: string) {
    const dayMarks = marksByDate[key] ?? [];
    const dayActivities = activitiesByDate[key] ?? [];
    const chips: { id: string; label: string; className: string }[] = [];
    for (const m of dayMarks) {
      if (chips.length >= 3) break;
      chips.push({
        id: m._id,
        label: m.title,
        className: getMarkChipClass(m.colorKey),
      });
    }
    for (const a of dayActivities) {
      if (chips.length >= 3) break;
      chips.push({
        id: a._id,
        label: a.title,
        className: getCategoryColor(a.category),
      });
    }
    const total = dayMarks.length + dayActivities.length;
    const overflow = total - chips.length;
    return { chips, overflow };
  }

  async function deleteMark(id: string) {
    const res = await fetch(`/api/calendar-marks/${id}`, { method: "DELETE" });
    if (res.ok) loadCalendarData();
  }

  return (
    <div className="space-y-4">
      <MarkRecurringEventsDialog
        open={markDialogOpen}
        onOpenChange={setMarkDialogOpen}
        onSaved={loadCalendarData}
      />
      <EditCalendarMarkDialog
        open={editingMark !== null}
        mark={editingMark}
        onOpenChange={(o) => {
          if (!o) setEditingMark(null);
        }}
        onSaved={loadCalendarData}
      />
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{format(current, "MMMM yyyy")}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => setMarkDialogOpen(true)}
            >
              <CalendarPlus className="h-4 w-4" />
              Mark recurring events
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrent(subMonths(current, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrent(addMonths(current, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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
              const dayMarks = marksByDate[key] ?? [];
              const { chips, overflow } = dayChips(key);
              const isCurrentMonth = isSameMonth(d, current);
              const isSelected = selectedDate === key;
              const isTodayCell = isToday(d);
              const totalItems = dayActivities.length + dayMarks.length;

              function handleDayActivate() {
                setSelectedDate(key);
              }

              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-current={isTodayCell ? "date" : undefined}
                  aria-label={`${format(d, "EEEE, MMMM d, yyyy")}. ${totalItems} items.`}
                  aria-pressed={isSelected}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("[data-add-activity]")) return;
                    handleDayActivate();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if ((e.target as HTMLElement).closest("[data-add-activity]")) return;
                      handleDayActivate();
                    }
                  }}
                  className={cn(
                    "group relative min-h-[80px] rounded-md border p-2 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    !isCurrentMonth && "bg-muted/50 text-muted-foreground",
                    isCurrentMonth && "bg-card",
                    isTodayCell &&
                      "border-primary/70 bg-primary/[0.12] shadow-sm dark:bg-primary/15",
                    isSelected && "z-[1] ring-2 ring-primary ring-offset-2 ring-offset-background",
                    !isSelected &&
                      (isTodayCell
                        ? "hover:bg-primary/[0.18] dark:hover:bg-primary/20"
                        : "hover:bg-muted/50")
                  )}
                >
                  <div className="pointer-events-none flex items-start justify-between gap-1">
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        isTodayCell &&
                          "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground"
                      )}
                    >
                      {format(d, "d")}
                    </span>
                  </div>
                  {chips.length > 0 && (
                    <div className="pointer-events-none mt-1 space-y-0.5">
                      {chips.map((c) => (
                        <div
                          key={c.id}
                          className={cn("truncate rounded px-1 text-xs", c.className)}
                          title={c.label}
                        >
                          {c.label}
                        </div>
                      ))}
                      {overflow > 0 && (
                        <div className="text-xs text-muted-foreground">+{overflow} more</div>
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      "pointer-events-none absolute bottom-1.5 right-1.5 z-10 opacity-0 transition-opacity",
                      "group-hover:pointer-events-auto group-hover:opacity-100"
                    )}
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="pointer-events-auto h-7 gap-1 px-2 text-xs shadow-md"
                      asChild
                      data-add-activity
                    >
                      <Link
                        href={`/activities/add?date=${key}&from=calendar`}
                        data-add-activity
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        Add activity
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>Day details · {selectedDate}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedMarks.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Marked events</h3>
                <ul className="space-y-2">
                  {selectedMarks.map((m) => (
                    <li
                      key={m._id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm"
                    >
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">{m.title}</p>
                        <span
                          className={cn(
                            "inline-flex rounded px-1.5 py-0.5 text-xs font-medium",
                            getMarkChipClass(m.colorKey)
                          )}
                        >
                          Highlight
                        </span>
                        {m.details && m.details.trim().length > 0 && (
                          <p className="text-xs text-muted-foreground">{m.details}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1"
                          onClick={() => setEditingMark(m)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void deleteMark(m._id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Activities</h3>
              {selectedActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activities on this day.</p>
              ) : (
                <ul className="space-y-2">
                  {selectedActivities.map((a) => (
                    <li
                      key={a._id}
                      className="flex justify-between rounded-lg border p-3 text-sm"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{a.title}</p>
                        <p className="text-muted-foreground">
                          <span
                            className={cn(
                              "mr-1 inline-flex rounded px-1.5 py-0.5 text-xs font-medium",
                              getCategoryColor(a.category)
                            )}
                          >
                            {a.category}
                          </span>
                          {a.startTime} – {a.endTime} ({a.duration}h)
                        </p>
                        {a.notes && a.notes.trim().length > 0 && (
                          <p className="text-muted-foreground text-xs">{a.notes}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

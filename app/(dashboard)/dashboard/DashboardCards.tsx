"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, isValid, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActivityRecord, type UpcomingActivityPreview } from "@/types/activity";
import { CalendarDays, ChevronRight, ClipboardList, ListTodo } from "lucide-react";

interface DashboardCardsProps {
  totalHours: number;
  activities: ActivityRecord[];
  variant: "day" | "range";
  overdueTodos: number;
  openTodos: number;
  upcomingPreview: UpcomingActivityPreview[];
  /** e.g. "Today", "This week", "Last month", or a calendar date — shown on stat cards and logged list */
  dashboardScopeLabel: string;
}

const activityRowClassName =
  "flex items-start justify-between gap-2 rounded-md px-2 py-2.5 transition-colors duration-150 hover:bg-dashboard-panel-muted first:pt-0 last:pb-0";

function LoggedActivityRow({ activity: a }: { activity: ActivityRecord }) {
  const detail = a.notes?.trim();
  return (
    <>
      <div className="min-w-0 flex-1">
        <span className="block text-foreground">{a.title}</span>
        {detail ? (
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{detail}</span>
        ) : null}
      </div>
      <span className="shrink-0 tabular-nums text-muted-foreground">
        {a.startTime} – {a.endTime} ({a.duration}h)
      </span>
    </>
  );
}

function CollapsedSectionChip({
  kind,
  count,
  onExpand,
  ariaLabel,
}: {
  kind: "todo" | "calendar" | "logged";
  count: number;
  onExpand: () => void;
  ariaLabel: string;
}) {
  const Icon = kind === "todo" ? ListTodo : kind === "calendar" ? CalendarDays : ClipboardList;
  const display = count > 99 ? "99+" : String(count);

  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 shadow-md transition",
        "hover:brightness-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-[0.97]",
        kind === "todo" &&
          "border-dashboard-warn-border bg-dashboard-warn text-dashboard-warn-fg dark:border-dashboard-warn-border",
        kind === "calendar" && "border-primary/50 bg-primary/15 text-primary dark:border-primary/40 dark:bg-primary/20",
        kind === "logged" &&
          "border-dashboard-list-border bg-dashboard-list text-foreground ring-1 ring-primary/[0.12] dark:ring-primary/20"
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span
        className={cn(
          "absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums leading-none ring-2 ring-background",
          kind === "todo" && "bg-foreground text-background",
          kind === "calendar" && "bg-primary text-primary-foreground",
          kind === "logged" && "bg-[hsl(var(--chart-2))] text-white"
        )}
      >
        {display}
      </span>
    </button>
  );
}

function groupActivitiesByDate(activities: ActivityRecord[]) {
  const map = new Map<string, ActivityRecord[]>();
  for (const a of activities) {
    const key = a.date;
    const list = map.get(key) ?? [];
    list.push(a);
    map.set(key, list);
  }
  return Array.from(map.entries()).sort(([da], [db]) => da.localeCompare(db));
}

type UpcomingPreviewMergedRow = {
  title: string;
  slots: { date: string; startTime: string }[];
};

/** Merge same title (within category); slots sorted by date then time */
function mergeUpcomingByTitle(rows: UpcomingActivityPreview[]): UpcomingPreviewMergedRow[] {
  const order: string[] = [];
  const map = new Map<string, { date: string; startTime: string }[]>();
  for (const a of rows) {
    if (!map.has(a.title)) {
      order.push(a.title);
      map.set(a.title, []);
    }
    map.get(a.title)!.push({ date: a.date, startTime: a.startTime });
  }
  return order.map((title) => {
    const slots = map.get(title)!;
    slots.sort((x, y) => {
      const d = x.date.localeCompare(y.date);
      if (d !== 0) return d;
      return x.startTime.localeCompare(y.startTime);
    });
    return { title, slots };
  });
}

/** First `limit` items in date/time order, grouped by category, then merged by title */
function groupUpcomingPreviewByCategory(
  items: UpcomingActivityPreview[],
  limit: number
): [string, UpcomingPreviewMergedRow[]][] {
  const sorted = [...items].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.startTime.localeCompare(b.startTime);
  });
  const shown = sorted.slice(0, limit);
  const byCat = new Map<string, UpcomingActivityPreview[]>();
  for (const a of shown) {
    const cat = a.category?.trim() || "Uncategorized";
    const list = byCat.get(cat) ?? [];
    list.push(a);
    byCat.set(cat, list);
  }
  return [...byCat.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cat, list]) => [cat, mergeUpcomingByTitle(list)] as const);
}

export function DashboardCards({
  totalHours,
  activities,
  variant,
  overdueTodos,
  openTodos,
  upcomingPreview,
  dashboardScopeLabel,
}: DashboardCardsProps) {
  const [todoReminderOpen, setTodoReminderOpen] = useState(true);
  const [calendarReminderOpen, setCalendarReminderOpen] = useState(true);
  const [loggedActivitiesOpen, setLoggedActivitiesOpen] = useState(true);

  const emptyCopy =
    variant === "range"
      ? "No activities logged in this period."
      : "No activities logged for this day.";

  const showTodoReminder = overdueTodos > 0 || openTodos > 0;
  const showUpcomingReminder = upcomingPreview.length > 0;
  const upcomingTotal = upcomingPreview.length;
  const upcomingPreviewLimit = 5;
  const groupedUpcomingPreview = useMemo(
    () => groupUpcomingPreviewByCategory(upcomingPreview, upcomingPreviewLimit),
    [upcomingPreview]
  );
  const todoBadgeCount = overdueTodos > 0 ? overdueTodos : openTodos;
  const hasCollapsedChips =
    (showTodoReminder && !todoReminderOpen) ||
    (showUpcomingReminder && !calendarReminderOpen) ||
    !loggedActivitiesOpen;

  function formatUpcomingDay(dateStr: string) {
    const d = parseISO(`${dateStr}T12:00:00`);
    return isValid(d) ? format(d, "EEE MMM d") : dateStr;
  }

  return (
    <div className="space-y-6">
      {hasCollapsedChips ? (
        <div className="flex flex-wrap items-center gap-3">
          {showTodoReminder && !todoReminderOpen ? (
            <CollapsedSectionChip
              kind="todo"
              count={todoBadgeCount}
              onExpand={() => setTodoReminderOpen(true)}
              ariaLabel={`Show To Do reminder, ${todoBadgeCount} ${todoBadgeCount === 1 ? "task" : "tasks"}`}
            />
          ) : null}
          {showUpcomingReminder && !calendarReminderOpen ? (
            <CollapsedSectionChip
              kind="calendar"
              count={upcomingTotal}
              onExpand={() => setCalendarReminderOpen(true)}
              ariaLabel={`Show calendar reminder, ${upcomingTotal} upcoming ${upcomingTotal === 1 ? "activity" : "activities"}`}
            />
          ) : null}
          {!loggedActivitiesOpen ? (
            <div className="flex flex-wrap items-center gap-2">
              <CollapsedSectionChip
                kind="logged"
                count={activities.length}
                onExpand={() => setLoggedActivitiesOpen(true)}
                ariaLabel={`Show logged activities for ${dashboardScopeLabel}, ${activities.length} ${activities.length === 1 ? "entry" : "entries"}`}
              />
              <span className="text-xs tabular-nums text-muted-foreground">
                {totalHours.toFixed(1)}h logged
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {showTodoReminder && todoReminderOpen ? (
        <div className="overflow-hidden rounded-xl border-2 border-dashboard-warn-border bg-dashboard-warn shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-dashboard-warn-border/70 bg-black/[0.04] px-3 py-2 dark:bg-white/[0.06]">
            <span className="text-xs font-semibold uppercase tracking-wide text-dashboard-warn-fg">
              To Do reminder
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 text-xs text-dashboard-warn-fg hover:bg-black/10 dark:hover:bg-white/10"
              onClick={() => setTodoReminderOpen(false)}
              aria-expanded
            >
              Hide
            </Button>
          </div>
          <Link
            href="/todos"
            aria-label="Open To Do list"
            className="group block p-4 transition hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring dark:hover:bg-white/[0.04]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-dashboard-warn-fg">
                  To Do reminder:{" "}
                  {overdueTodos > 0
                    ? `You have ${overdueTodos} overdue ${overdueTodos === 1 ? "task" : "tasks"}`
                    : `You have ${openTodos} open ${openTodos === 1 ? "task" : "tasks"}`}.
                </p>
                <p className="mt-1 text-sm text-dashboard-warn-fg opacity-80">
                  Review your remaining tasks in the To Do section.
                </p>
              </div>
              <ChevronRight
                className="mt-0.5 h-5 w-5 shrink-0 text-dashboard-warn-fg opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                aria-hidden
              />
            </div>
          </Link>
        </div>
      ) : null}

      {showUpcomingReminder && calendarReminderOpen ? (
        <div className="overflow-hidden rounded-xl border-2 border-primary/35 bg-primary/[0.08] shadow-sm dark:bg-primary/10">
          <div className="flex items-center justify-between gap-2 border-b border-primary/25 bg-black/[0.03] px-3 py-2 dark:bg-white/[0.05]">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden />
              Calendar (7 days)
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 text-xs text-foreground hover:bg-primary/15"
              onClick={() => setCalendarReminderOpen(false)}
              aria-expanded
            >
              Hide
            </Button>
          </div>
          <Link
            href="/calendar"
            aria-label="Open calendar to view upcoming activities"
            className="group block p-4 transition hover:bg-primary/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring dark:hover:bg-primary/15"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">Upcoming on your calendar</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Next 7 days: {upcomingTotal} scheduled {upcomingTotal === 1 ? "activity" : "activities"}.
                </p>
                <div className="mt-3 border-t border-primary/20 pt-3 text-sm">
                  {groupedUpcomingPreview.map(([category, rows], catIdx) => (
                    <div
                      key={category}
                      className={cn(
                        catIdx > 0 && "mt-3 border-t border-primary/25 pt-3"
                      )}
                    >
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {category}
                      </p>
                      <ul className="divide-y divide-primary/20">
                        {rows.map((row) => (
                          <li
                            key={`${category}:${row.title}`}
                            className="flex items-start justify-between gap-3 py-2.5"
                          >
                            <span className="min-w-0 truncate font-medium text-foreground">{row.title}</span>
                            <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:text-sm">
                              {row.slots.map((s, i) => (
                                <span key={`${s.date}-${s.startTime}-${i}`} className="block whitespace-nowrap">
                                  {formatUpcomingDay(s.date)} · {s.startTime}
                                </span>
                              ))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {upcomingTotal > 5 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    +{upcomingTotal - 5} more on the calendar — open to see all.
                  </p>
                ) : null}
              </div>
              <ChevronRight
                className="mt-0.5 h-5 w-5 shrink-0 text-primary opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                aria-hidden
              />
            </div>
          </Link>
        </div>
      ) : null}
      {loggedActivitiesOpen ? (
        <div className="overflow-hidden rounded-xl border-2 border-dashboard-list-border bg-dashboard-list shadow-md ring-1 ring-primary/[0.06]">
          <div className="flex flex-col gap-2 border-b border-dashboard-list-border bg-black/[0.03] px-3 py-2 dark:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold uppercase tracking-wide text-foreground">
                <ClipboardList className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--chart-2))]" aria-hidden />
                <span className="break-words">
                  Logged activities{" "}
                  <span className="font-normal normal-case text-muted-foreground">
                    ({dashboardScopeLabel})
                  </span>
                </span>
              </span>
              <div className="flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-dashboard-list-border bg-background/60 px-2.5 py-1.5 text-xs dark:bg-background/40">
                <span className="text-muted-foreground">Hours</span>
                <span className="text-base font-bold tabular-nums leading-none text-primary sm:text-lg">
                  {totalHours.toFixed(1)}h
                </span>
                <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
                <span className="text-muted-foreground">Activities</span>
                <span className="text-base font-bold tabular-nums leading-none text-[hsl(var(--chart-2))] sm:text-lg">
                  {activities.length}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 self-end text-xs text-foreground hover:bg-primary/10 sm:self-auto"
              onClick={() => setLoggedActivitiesOpen(false)}
            >
              Hide
            </Button>
          </div>
          <div className="px-6 pb-6 pt-4">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{emptyCopy}</p>
            ) : variant === "day" ? (
              <ul className="divide-y divide-border text-sm">
                {activities.map((a) => (
                  <li key={String(a._id)} className={activityRowClassName}>
                    <LoggedActivityRow activity={a} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="max-h-[28rem] overflow-y-auto pr-1 text-sm">
                {groupActivitiesByDate(activities).map(([dayKey, rows], i) => (
                  <div
                    key={dayKey}
                    className={
                      i > 0 ? "mt-4 border-t border-border pt-4" : ""
                    }
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {dayKey}
                    </p>
                    <ul className="divide-y divide-border">
                      {rows.map((a) => (
                        <li key={String(a._id)} className={activityRowClassName}>
                          <LoggedActivityRow activity={a} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

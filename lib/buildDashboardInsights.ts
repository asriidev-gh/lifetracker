import { getDay } from "date-fns";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PRESET_SCOPES = new Set(["This week", "Last week", "This month", "Last month"]);

export type InsightActivityInput = {
  category: string;
  duration: number;
  date: string;
};

/** Natural language tail for “this week” / “on May 10, 2026” / “today”. */
function naturalPeriod(scopeLabel: string): string {
  if (scopeLabel === "Today") return "today";
  if (PRESET_SCOPES.has(scopeLabel)) {
    return scopeLabel.charAt(0).toLowerCase() + scopeLabel.slice(1);
  }
  return `on ${scopeLabel}`;
}

export function buildDashboardInsights(
  items: InsightActivityInput[],
  scopeLabel: string
): { insights: string[]; totalHours: number } {
  const totalHours = items.reduce((s, a) => s + (a.duration ?? 0), 0);
  if (items.length === 0) {
    return { insights: [], totalHours: 0 };
  }

  const when = naturalPeriod(scopeLabel);

  const byCategory = items.reduce<Record<string, { count: number; hours: number }>>((acc, a) => {
    if (!acc[a.category]) acc[a.category] = { count: 0, hours: 0 };
    acc[a.category].count += 1;
    acc[a.category].hours += a.duration ?? 0;
    return acc;
  }, {});

  const byDay = items.reduce<Record<number, number>>((acc, a) => {
    const d = new Date(`${a.date.slice(0, 10)}T12:00:00`);
    const day = getDay(d);
    acc[day] = (acc[day] ?? 0) + (a.duration ?? 0);
    return acc;
  }, {});

  const mostFrequentCategory =
    Object.entries(byCategory).sort((a, b) => b[1].count - a[1].count)[0]?.[0] ?? "—";
  const mostActiveDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  const mostActiveDayName = mostActiveDay ? DAY_NAMES[Number(mostActiveDay[0])] : "—";

  const exerciseCount = byCategory["Sports"]?.count ?? 0;
  const workHours = byCategory["Work"]?.hours ?? 0;

  const insights = [
    exerciseCount > 0 &&
      `You exercised ${exerciseCount} time${exerciseCount === 1 ? "" : "s"} ${when}.`,
    workHours > 0 && `You worked ${Math.round(workHours * 10) / 10} hours ${when}.`,
    `Most frequent activity category: ${mostFrequentCategory}`,
    `Most active day: ${mostActiveDayName}`,
  ].filter(Boolean) as string[];

  return { insights, totalHours };
}

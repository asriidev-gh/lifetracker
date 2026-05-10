import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";

export const DASHBOARD_PRESETS = [
  { slug: "this-week" as const, label: "This week" },
  { slug: "last-week" as const, label: "Last week" },
  { slug: "this-month" as const, label: "This month" },
  { slug: "last-month" as const, label: "Last month" },
] as const;

export type DashboardRangeSlug = (typeof DASHBOARD_PRESETS)[number]["slug"];

const RANGE_SET = new Set<string>(DASHBOARD_PRESETS.map((p) => p.slug));

function isRangeSlug(s: string): s is DashboardRangeSlug {
  return RANGE_SET.has(s);
}

/** Monday-based weeks (ISO-style). */
const WEEK_OPTS = { weekStartsOn: 1 as const };

export type DashboardViewDay = {
  mode: "day";
  viewDate: Date;
  dateKey: string;
  isToday: boolean;
  rangeStart: Date;
  rangeEnd: Date;
};

export type DashboardViewRange = {
  mode: "range";
  rangeSlug: DashboardRangeSlug;
  periodLabel: string;
  rangeHeading: string;
  rangeStart: Date;
  rangeEnd: Date;
};

export type DashboardView = DashboardViewDay | DashboardViewRange;

function resolveDay(dateParam?: string | string[]): DashboardViewDay {
  const raw = Array.isArray(dateParam) ? dateParam[0] : dateParam;
  let viewDate = startOfDay(new Date());
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = startOfDay(parseISO(raw));
    if (isValid(parsed)) {
      viewDate = parsed;
    }
  }
  const todayStart = startOfDay(new Date());
  if (isAfter(viewDate, todayStart)) {
    viewDate = todayStart;
  }
  const dateKey = format(viewDate, "yyyy-MM-dd");
  const isToday = isSameDay(viewDate, new Date());
  return {
    mode: "day",
    viewDate,
    dateKey,
    isToday,
    rangeStart: viewDate,
    rangeEnd: endOfDay(viewDate),
  };
}

function resolveRange(slug: DashboardRangeSlug, now: Date): DashboardViewRange {
  let rangeStart: Date;
  let rangeEnd: Date;
  let periodLabel: string;
  let rangeHeading: string;

  switch (slug) {
    case "this-week": {
      const s = startOfWeek(now, WEEK_OPTS);
      const e = endOfWeek(now, WEEK_OPTS);
      rangeStart = startOfDay(s);
      rangeEnd = endOfDay(e);
      periodLabel = "This week";
      rangeHeading = `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`;
      break;
    }
    case "last-week": {
      const ref = subWeeks(now, 1);
      const s = startOfWeek(ref, WEEK_OPTS);
      const e = endOfWeek(ref, WEEK_OPTS);
      rangeStart = startOfDay(s);
      rangeEnd = endOfDay(e);
      periodLabel = "Last week";
      rangeHeading = `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`;
      break;
    }
    case "this-month": {
      const s = startOfMonth(now);
      const e = endOfMonth(now);
      rangeStart = startOfDay(s);
      rangeEnd = endOfDay(e);
      periodLabel = "This month";
      rangeHeading = format(rangeStart, "MMMM yyyy");
      break;
    }
    case "last-month": {
      const ref = subMonths(now, 1);
      const s = startOfMonth(ref);
      const e = endOfMonth(ref);
      rangeStart = startOfDay(s);
      rangeEnd = endOfDay(e);
      periodLabel = "Last month";
      rangeHeading = format(rangeStart, "MMMM yyyy");
      break;
    }
  }

  return { mode: "range", rangeSlug: slug, periodLabel, rangeHeading, rangeStart, rangeEnd };
}

export function resolveDashboardView(searchParams: {
  date?: string;
  range?: string;
}): DashboardView {
  const rangeParam = searchParams.range;
  if (typeof rangeParam === "string" && isRangeSlug(rangeParam)) {
    return resolveRange(rangeParam, new Date());
  }
  return resolveDay(searchParams.date);
}

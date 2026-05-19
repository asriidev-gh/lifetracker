import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  getDate,
  getDay,
  isBefore,
  parseISO,
  startOfMonth,
} from "date-fns";
import type { CalendarMarkRecurrence } from "@/types/calendarMark";

export const CALENDAR_MARK_RECURRENCE_VALUES = [
  "one-time",
  "weekly",
  "monthly",
] as const satisfies readonly CalendarMarkRecurrence[];

export function normalizeRecurrence(value: unknown): CalendarMarkRecurrence {
  if (value === "weekly" || value === "monthly") return value;
  return "one-time";
}

export function recurrenceLabel(recurrence: CalendarMarkRecurrence | undefined): string {
  switch (recurrence) {
    case "weekly":
      return "Every week";
    case "monthly":
      return "Every month";
    default:
      return "One time only";
  }
}

type MarkTemplate = {
  _id: string;
  userId: string;
  date: string;
  title: string;
  details?: string;
  colorKey: string;
  recurrence?: CalendarMarkRecurrence;
};

export type ExpandedCalendarMark = MarkTemplate & {
  recurrence: CalendarMarkRecurrence;
  sourceId?: string;
  anchorDate?: string;
};

function occurrenceId(sourceId: string, date: string) {
  return `${sourceId}@${date}`;
}

export function expandRecurringMarks(
  templates: MarkTemplate[],
  dateFrom: string,
  dateTo: string
): ExpandedCalendarMark[] {
  const rangeStart = parseISO(dateFrom);
  const rangeEnd = parseISO(dateTo);
  const expanded: ExpandedCalendarMark[] = [];

  for (const template of templates) {
    const recurrence = normalizeRecurrence(template.recurrence);
    if (recurrence === "one-time") continue;

    const anchorDate = template.date.slice(0, 10);
    const anchor = parseISO(anchorDate);
    const base = {
      ...template,
      recurrence,
      sourceId: template._id,
      anchorDate,
    };

    if (recurrence === "weekly") {
      const targetDow = getDay(anchor);
      let day = rangeStart;
      while (day <= rangeEnd) {
        if (getDay(day) === targetDow && !isBefore(day, anchor)) {
          const date = format(day, "yyyy-MM-dd");
          expanded.push({
            ...base,
            _id: occurrenceId(template._id, date),
            date,
          });
        }
        day = addDays(day, 1);
      }
      continue;
    }

    const dayOfMonth = getDate(anchor);
    let monthCursor = startOfMonth(rangeStart);
    const lastMonth = startOfMonth(rangeEnd);

    while (monthCursor <= lastMonth) {
      const lastDay = getDate(endOfMonth(monthCursor));
      const day = Math.min(dayOfMonth, lastDay);
      const occurrence = new Date(
        monthCursor.getFullYear(),
        monthCursor.getMonth(),
        day
      );
      if (
        occurrence >= rangeStart &&
        occurrence <= rangeEnd &&
        !isBefore(occurrence, anchor)
      ) {
        const date = format(occurrence, "yyyy-MM-dd");
        expanded.push({
          ...base,
          _id: occurrenceId(template._id, date),
          date,
        });
      }
      monthCursor = addMonths(monthCursor, 1);
    }
  }

  return expanded;
}

export function resolveMarkId(id: string): string {
  const at = id.indexOf("@");
  return at === -1 ? id : id.slice(0, at);
}

import type { CalendarMarkColorKey } from "@/lib/calendarMarkColors";

export type { CalendarMarkColorKey };

export type CalendarMarkRecurrence = "one-time" | "weekly" | "monthly";

export interface CalendarMarkRecord {
  _id: string;
  userId: string;
  date: string;
  title: string;
  details?: string;
  colorKey: string;
  recurrence?: CalendarMarkRecurrence;
  /** Set on expanded weekly/monthly occurrences; use for edit/delete of the series. */
  sourceId?: string;
  /** Anchor/start date for recurring series (on expanded occurrences). */
  anchorDate?: string;
}

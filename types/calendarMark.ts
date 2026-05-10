import type { CalendarMarkColorKey } from "@/lib/calendarMarkColors";

export type { CalendarMarkColorKey };

export interface CalendarMarkRecord {
  _id: string;
  userId: string;
  date: string;
  title: string;
  details?: string;
  colorKey: string;
}

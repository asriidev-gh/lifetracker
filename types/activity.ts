export type EnergyLevel = "low" | "medium" | "high";

/** Minimal fields for dashboard “upcoming calendar” preview */
export interface UpcomingActivityPreview {
  _id: string;
  title: string;
  category: string;
  date: string;
  startTime: string;
}

export interface ActivityRecord {
  _id: string;
  userId: string;
  title: string;
  category: string;
  tags: string[];
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  energyLevel: EnergyLevel;
  notes?: string;
  /** Optional; typically used when category is Finance. API may return null when cleared. */
  amount?: number | null;
  createdAt?: string;
}

export const CATEGORIES = [
  "Sports",
  "Work",
  "Social",
  "Church",
  "Spiritual",
  "Finance",
  "Family",
  "Personal",
  "Learning",
] as const;

export type Category = (typeof CATEGORIES)[number];

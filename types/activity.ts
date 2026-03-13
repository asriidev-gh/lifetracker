export type EnergyLevel = "low" | "medium" | "high";

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
  createdAt?: string;
}

export const CATEGORIES = [
  "Sports",
  "Work",
  "Social",
  "Church",
  "Finance",
  "Family",
  "Personal",
  "Learning",
] as const;

export type Category = (typeof CATEGORIES)[number];

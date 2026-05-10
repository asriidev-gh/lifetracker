import type { PasswordEntryCategoryKey } from "@/lib/passwordEntryCategories";

export type { PasswordEntryCategoryKey };

export interface PasswordEntryRecord {
  _id: string;
  userId: string;
  label: string;
  username: string;
  category: PasswordEntryCategoryKey;
  password: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

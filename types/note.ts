import type { NoteCategoryKey } from "@/lib/noteCategories";

export type { NoteCategoryKey };

export interface NoteRecord {
  _id: string;
  userId: string;
  title: string;
  content: string;
  category: NoteCategoryKey;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

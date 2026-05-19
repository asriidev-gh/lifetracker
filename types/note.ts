import type { NoteCategoryKey } from "@/lib/noteCategories";
import type { NoteColorKey } from "@/lib/noteColors";

export type { NoteCategoryKey, NoteColorKey };

export interface NoteRecord {
  _id: string;
  userId: string;
  title: string;
  content: string;
  category: NoteCategoryKey;
  colorKey: NoteColorKey;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

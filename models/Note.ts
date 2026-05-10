import mongoose, { Model, Schema, Types } from "mongoose";
import { NOTE_CATEGORY_KEYS } from "@/lib/noteCategories";

export interface INote {
  _id: string;
  userId: Types.ObjectId;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [...NOTE_CATEGORY_KEYS],
      default: "quick",
    },
    isPinned: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NoteSchema.index({ userId: 1, isArchived: 1, isPinned: -1, updatedAt: -1 });

export const Note: Model<INote> = mongoose.models.Note ?? mongoose.model<INote>("Note", NoteSchema);

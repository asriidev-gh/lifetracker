import mongoose, { Model, Schema, Types } from "mongoose";
import { PASSWORD_ENTRY_CATEGORY_KEYS } from "@/lib/passwordEntryCategories";

export interface IPasswordEntry {
  _id: string;
  userId: Types.ObjectId;
  label: string;
  username: string;
  category: string;
  encryptedPassword: string;
  iv: string;
  authTag: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordEntrySchema = new Schema<IPasswordEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    label: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: [...PASSWORD_ENTRY_CATEGORY_KEYS],
      default: "email",
    },
    encryptedPassword: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

PasswordEntrySchema.index({ userId: 1, label: 1 });

const existingModel = mongoose.models.PasswordEntry as Model<IPasswordEntry> | undefined;

if (existingModel) {
  const categoryPath = existingModel.schema.path("category") as
    | (Schema.Types.String & { enumValues?: string[]; options?: { enum?: string[]; default?: string } })
    | undefined;
  if (categoryPath) {
    categoryPath.enumValues = [...PASSWORD_ENTRY_CATEGORY_KEYS];
    if (categoryPath.options) {
      categoryPath.options.enum = [...PASSWORD_ENTRY_CATEGORY_KEYS];
      categoryPath.options.default = "email";
    }
  }
}

export const PasswordEntry: Model<IPasswordEntry> =
  existingModel ?? mongoose.model<IPasswordEntry>("PasswordEntry", PasswordEntrySchema);

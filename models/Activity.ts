import mongoose, { Schema, Model, Types } from "mongoose";

export type EnergyLevel = "low" | "medium" | "high";

export interface IActivity {
  _id: string;
  userId: Types.ObjectId;
  title: string;
  category: string;
  tags: string[];
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  energyLevel: EnergyLevel;
  notes?: string;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    tags: [{ type: String }],
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    duration: { type: Number, required: true },
    energyLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ActivitySchema.index({ userId: 1, date: -1 });
ActivitySchema.index({ userId: 1, category: 1 });

export const Activity: Model<IActivity> =
  mongoose.models.Activity ??
  mongoose.model<IActivity>("Activity", ActivitySchema);

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

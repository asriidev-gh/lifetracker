import mongoose, { Model, Schema, Types } from "mongoose";
import { CALENDAR_MARK_COLOR_KEYS } from "@/lib/calendarMarkColors";

export interface ICalendarMark {
  _id: string;
  userId: Types.ObjectId;
  date: Date;
  title: string;
  details?: string;
  colorKey: string;
  createdAt: Date;
}

const CalendarMarkSchema = new Schema<ICalendarMark>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    title: { type: String, required: true, trim: true },
    details: { type: String, trim: true },
    colorKey: {
      type: String,
      required: true,
      enum: [...CALENDAR_MARK_COLOR_KEYS],
      default: "sky",
    },
  },
  { timestamps: true }
);

CalendarMarkSchema.index({ userId: 1, date: 1 });

export const CalendarMark: Model<ICalendarMark> =
  mongoose.models.CalendarMark ??
  mongoose.model<ICalendarMark>("CalendarMark", CalendarMarkSchema);

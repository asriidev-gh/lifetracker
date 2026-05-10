import mongoose, { Model, Schema, Types } from "mongoose";

export type ExpenseItemType = "recurring" | "one-time";

export interface IExpensePlanItem {
  _id: string;
  userId: Types.ObjectId;
  name: string;
  amount: number;
  type: ExpenseItemType;
  dueDay?: number;
  dueDate?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExpensePlanItemSchema = new Schema<IExpensePlanItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["recurring", "one-time"], required: true, default: "recurring" },
    dueDay: { type: Number, min: 1, max: 31 },
    dueDate: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ExpensePlanItemSchema.index({ userId: 1, type: 1, active: 1 });
ExpensePlanItemSchema.index({ userId: 1, dueDate: 1 });

export const ExpensePlanItem: Model<IExpensePlanItem> =
  mongoose.models.ExpensePlanItem ??
  mongoose.model<IExpensePlanItem>("ExpensePlanItem", ExpensePlanItemSchema);

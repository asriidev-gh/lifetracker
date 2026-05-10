import mongoose, { Model, Schema, Types } from "mongoose";

export interface ITodo {
  _id: string;
  userId: Types.ObjectId;
  title: string;
  notes?: string;
  dueDate?: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TodoSchema = new Schema<ITodo>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TodoSchema.index({ userId: 1, completed: 1, dueDate: 1 });
TodoSchema.index({ userId: 1, createdAt: -1 });

export const Todo: Model<ITodo> =
  mongoose.models.Todo ?? mongoose.model<ITodo>("Todo", TodoSchema);

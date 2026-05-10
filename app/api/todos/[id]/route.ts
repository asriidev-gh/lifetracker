import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Todo } from "@/models/Todo";

function serializeTodo(todo: {
  _id: { toString(): string };
  userId: { toString(): string };
  title: string;
  notes?: string;
  dueDate?: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    _id: todo._id.toString(),
    userId: todo.userId.toString(),
    title: todo.title,
    notes: todo.notes ?? "",
    dueDate: todo.dueDate instanceof Date ? todo.dueDate.toISOString().slice(0, 10) : "",
    completed: todo.completed,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : undefined;
    const notes = typeof body?.notes === "string" ? body.notes.trim() : undefined;
    const completed =
      typeof body?.completed === "boolean" ? body.completed : undefined;
    const dueDate =
      typeof body?.dueDate === "string" ? body.dueDate.trim() : undefined;

    await connectDB();
    const todo = await Todo.findOne({ _id: id, userId });
    if (!todo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (title !== undefined) {
      if (!title) {
        return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
      }
      todo.title = title;
    }
    if (notes !== undefined) todo.notes = notes;
    if (completed !== undefined) todo.completed = completed;
    if (dueDate !== undefined) {
      todo.dueDate = dueDate ? new Date(`${dueDate}T00:00:00`) : undefined;
    }
    await todo.save();

    return NextResponse.json(serializeTodo(todo.toObject()));
  } catch (error) {
    console.error("PUT todo error:", error);
    return NextResponse.json({ error: "Failed to update todo" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectDB();
    const deleted = await Todo.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE todo error:", error);
    return NextResponse.json({ error: "Failed to delete todo" }, { status: 500 });
  }
}

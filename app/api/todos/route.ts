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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    await connectDB();
    const todos = await Todo.find({ userId }).sort({ completed: 1, dueDate: 1, createdAt: -1 }).lean();
    return NextResponse.json(todos.map(serializeTodo));
  } catch (error) {
    console.error("GET todos error:", error);
    return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
    const dueDate = typeof body?.dueDate === "string" ? body.dueDate.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    await connectDB();
    const todo = await Todo.create({
      userId,
      title,
      notes,
      dueDate: dueDate ? new Date(`${dueDate}T00:00:00`) : undefined,
      completed: false,
    });
    return NextResponse.json(serializeTodo(todo.toObject()));
  } catch (error) {
    console.error("POST todos error:", error);
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}

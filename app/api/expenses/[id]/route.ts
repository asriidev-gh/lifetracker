import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { ExpensePlanItem } from "@/models/ExpensePlanItem";

function serializeExpense(item: {
  _id: { toString(): string };
  userId: { toString(): string };
  name: string;
  amount: number;
  type: "recurring" | "one-time";
  dueDay?: number;
  dueDate?: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    _id: item._id.toString(),
    userId: item.userId.toString(),
    name: item.name,
    amount: item.amount,
    type: item.type,
    dueDay: typeof item.dueDay === "number" ? item.dueDay : null,
    dueDate: item.dueDate instanceof Date ? item.dueDate.toISOString().slice(0, 10) : "",
    active: item.active,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function parseAmount(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return NaN;
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

    await connectDB();
    const item = await ExpensePlanItem.findOne({ _id: id, userId });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const nextType =
      body?.type === "one-time"
        ? "one-time"
        : body?.type === "recurring"
          ? "recurring"
          : item.type;

    if (body?.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      item.name = name;
    }
    if (body?.amount !== undefined) {
      const amount = parseAmount(body.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json({ error: "amount must be a valid non-negative number" }, { status: 400 });
      }
      item.amount = amount;
    }
    if (body?.active !== undefined) {
      item.active = Boolean(body.active);
    }

    item.type = nextType;
    if (nextType === "recurring") {
      const raw = body?.dueDay !== undefined ? Number(body.dueDay) : item.dueDay;
      if (raw === undefined || !Number.isInteger(raw) || raw < 1 || raw > 31) {
        return NextResponse.json({ error: "dueDay must be 1-31 for recurring expense" }, { status: 400 });
      }
      item.dueDay = raw;
      item.dueDate = undefined;
    } else {
      const dueDate =
        body?.dueDate !== undefined
          ? typeof body.dueDate === "string"
            ? body.dueDate.trim()
            : ""
          : item.dueDate instanceof Date
            ? item.dueDate.toISOString().slice(0, 10)
            : "";
      if (!dueDate) {
        return NextResponse.json({ error: "dueDate is required for one-time expense" }, { status: 400 });
      }
      item.dueDate = new Date(`${dueDate}T00:00:00`);
      item.dueDay = undefined;
    }

    await item.save();
    return NextResponse.json(serializeExpense(item.toObject()));
  } catch (error) {
    console.error("PUT expense item error:", error);
    return NextResponse.json({ error: "Failed to update expense item" }, { status: 500 });
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
    const deleted = await ExpensePlanItem.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE expense item error:", error);
    return NextResponse.json({ error: "Failed to delete expense item" }, { status: 500 });
  }
}

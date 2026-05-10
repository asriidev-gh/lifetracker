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
    const items = await ExpensePlanItem.find({ userId })
      .sort({ active: -1, type: 1, dueDay: 1, dueDate: 1, createdAt: -1 })
      .lean();
    return NextResponse.json(items.map(serializeExpense));
  } catch (error) {
    console.error("GET expenses error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
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
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const amount = parseAmount(body?.amount);
    const type = body?.type === "one-time" ? "one-time" : "recurring";
    const active = body?.active !== false;
    const dueDayRaw = Number(body?.dueDay);
    const dueDate = typeof body?.dueDate === "string" ? body.dueDate.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "amount must be a valid non-negative number" }, { status: 400 });
    }
    if (type === "recurring") {
      if (!Number.isInteger(dueDayRaw) || dueDayRaw < 1 || dueDayRaw > 31) {
        return NextResponse.json({ error: "dueDay must be 1-31 for recurring expense" }, { status: 400 });
      }
    } else if (!dueDate) {
      return NextResponse.json({ error: "dueDate is required for one-time expense" }, { status: 400 });
    }

    await connectDB();
    const created = await ExpensePlanItem.create({
      userId,
      name,
      amount,
      type,
      active,
      dueDay: type === "recurring" ? dueDayRaw : undefined,
      dueDate: type === "one-time" ? new Date(`${dueDate}T00:00:00`) : undefined,
    });
    return NextResponse.json(serializeExpense(created.toObject()));
  } catch (error) {
    console.error("POST expenses error:", error);
    return NextResponse.json({ error: "Failed to create expense item" }, { status: 500 });
  }
}

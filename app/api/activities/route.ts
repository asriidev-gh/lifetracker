import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Activity } from "@/models/Activity";

function parseOptionalAmount(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).trim());
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100) / 100;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const filter: Record<string, unknown> = { userId };
    if (dateFrom) {
      filter.date = { ...(filter.date as object), $gte: new Date(dateFrom) };
    }
    if (dateTo) {
      filter.date = {
        ...(filter.date as object),
        $lte: new Date(dateTo + "T23:59:59.999Z"),
      };
    }
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: new RegExp(search, "i") },
        { notes: new RegExp(search, "i") },
      ];
    }

    const activities = await Activity.find(filter)
      .sort({ date: -1, startTime: -1 })
      .lean();

    const serialized = activities.map((a) => ({
      ...a,
      _id: a._id.toString(),
      userId: a.userId.toString(),
      date: a.date instanceof Date ? a.date.toISOString().slice(0, 10) : a.date,
      amount: a.amount ?? null,
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("GET activities error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
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

    await connectDB();
    const body = await request.json();
    const {
      title,
      category,
      tags = [],
      date,
      dates: datesRaw,
      startTime,
      endTime,
      energyLevel = "medium",
      notes,
      amount: amountRaw,
    } = body;

    if (!title || !category || !startTime || !endTime) {
      return NextResponse.json(
        { error: "title, category, startTime, endTime are required" },
        { status: 400 }
      );
    }

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const duration = eh * 60 + em - (sh * 60 + sm);
    const durationHours = Math.round((duration / 60) * 100) / 100;
    const tagList = Array.isArray(tags) ? tags : [];
    const energy =
      ["low", "medium", "high"].includes(energyLevel) ? energyLevel : "medium";
    const notesStr = notes ?? "";
    const amount =
      category === "Finance" ? parseOptionalAmount(amountRaw) : undefined;

    const serializeOne = (doc: {
      toObject(): Record<string, unknown>;
      _id: { toString(): string };
      userId: { toString(): string };
      date: Date;
      amount?: number;
    }) => ({
      ...doc.toObject(),
      _id: doc._id.toString(),
      userId: doc.userId.toString(),
      date: doc.date.toISOString().slice(0, 10),
      amount: doc.amount ?? null,
    });

    if (Array.isArray(datesRaw) && datesRaw.length > 0) {
      if (datesRaw.length > 366) {
        return NextResponse.json(
          { error: "At most 366 days per request" },
          { status: 400 }
        );
      }
      const dates: string[] = [];
      for (const d of datesRaw) {
        if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          return NextResponse.json(
            { error: "Each dates entry must be YYYY-MM-DD" },
            { status: 400 }
          );
        }
        dates.push(d);
      }
      const created = await Activity.insertMany(
        dates.map((dateStr) => ({
          userId,
          title,
          category,
          tags: tagList,
          date: new Date(`${dateStr}T12:00:00`),
          startTime,
          endTime,
          duration: durationHours,
          energyLevel: energy,
          notes: notesStr,
          ...(amount !== undefined ? { amount } : {}),
        }))
      );
      const activities = created.map((doc) => serializeOne(doc));
      return NextResponse.json({ activities, count: activities.length });
    }

    if (!date) {
      return NextResponse.json(
        { error: "date is required (or provide dates[] for a range)" },
        { status: 400 }
      );
    }

    const activity = await Activity.create({
      userId,
      title,
      category,
      tags: tagList,
      date: new Date(date),
      startTime,
      endTime,
      duration: durationHours,
      energyLevel: energy,
      notes: notesStr,
      ...(amount !== undefined ? { amount } : {}),
    });

    return NextResponse.json(serializeOne(activity));
  } catch (error) {
    console.error("POST activity error:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}

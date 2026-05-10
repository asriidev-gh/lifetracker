import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { CalendarMark } from "@/models/CalendarMark";
import {
  CALENDAR_MARK_COLOR_KEYS,
  type CalendarMarkColorKey,
} from "@/lib/calendarMarkColors";
import { serializeCalendarMark } from "@/lib/serializeCalendarMark";

const ALLOWED_COLORS = new Set<string>(CALENDAR_MARK_COLOR_KEYS);

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    await connectDB();
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

    const marks = await CalendarMark.find(filter).sort({ date: 1, title: 1 }).lean();
    return NextResponse.json(marks.map((m) => serializeCalendarMark(m)));
  } catch (error) {
    console.error("GET calendar-marks error:", error);
    return NextResponse.json({ error: "Failed to fetch calendar marks" }, { status: 500 });
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
    const raw = body?.marks;
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json({ error: "marks array is required" }, { status: 400 });
    }
    if (raw.length > 200) {
      return NextResponse.json({ error: "At most 200 marks per request" }, { status: 400 });
    }

    const docs: {
      userId: string;
      date: Date;
      title: string;
      details?: string;
      colorKey: CalendarMarkColorKey;
    }[] = [];

    for (const item of raw) {
      const dateStr = typeof item?.date === "string" ? item.date.trim() : "";
      const title = typeof item?.title === "string" ? item.title.trim() : "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return NextResponse.json({ error: "Each mark needs date as YYYY-MM-DD" }, { status: 400 });
      }
      if (!title) {
        return NextResponse.json({ error: "Each mark needs a non-empty title" }, { status: 400 });
      }
      const detailsRaw = typeof item?.details === "string" ? item.details.trim() : "";
      let colorKey: CalendarMarkColorKey = "sky";
      if (typeof item?.colorKey === "string" && ALLOWED_COLORS.has(item.colorKey)) {
        colorKey = item.colorKey as CalendarMarkColorKey;
      }
      const doc: (typeof docs)[number] = {
        userId,
        date: new Date(`${dateStr}T12:00:00`),
        title,
        colorKey,
      };
      if (detailsRaw) doc.details = detailsRaw;
      docs.push(doc);
    }

    await connectDB();
    const created = await CalendarMark.insertMany(docs);
    return NextResponse.json(created.map((d) => serializeCalendarMark(d.toObject())));
  } catch (error) {
    console.error("POST calendar-marks error:", error);
    return NextResponse.json({ error: "Failed to create calendar marks" }, { status: 500 });
  }
}

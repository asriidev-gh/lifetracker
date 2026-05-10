import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { CalendarMark } from "@/models/CalendarMark";
import { CALENDAR_MARK_COLOR_KEYS } from "@/lib/calendarMarkColors";
import { serializeCalendarMark } from "@/lib/serializeCalendarMark";

const ALLOWED_COLORS = new Set<string>(CALENDAR_MARK_COLOR_KEYS);

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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    await connectDB();
    const mark = await CalendarMark.findOne({ _id: id, userId });
    if (!mark) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.date !== undefined) {
      const dateStr = String(body.date).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
      }
      mark.date = new Date(`${dateStr}T12:00:00`);
    }

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) {
        return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
      }
      mark.title = title;
    }

    if (body.details !== undefined) {
      const d = body.details === null || body.details === "" ? "" : String(body.details).trim();
      mark.details = d || undefined;
    }

    if (body.colorKey !== undefined) {
      const ck = String(body.colorKey);
      if (!ALLOWED_COLORS.has(ck)) {
        return NextResponse.json({ error: "Invalid colorKey" }, { status: 400 });
      }
      mark.colorKey = ck;
    }

    await mark.save();
    return NextResponse.json(serializeCalendarMark(mark.toObject()));
  } catch (error) {
    console.error("PUT calendar-mark error:", error);
    return NextResponse.json({ error: "Failed to update calendar mark" }, { status: 500 });
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
    const result = await CalendarMark.findOneAndDelete({ _id: id, userId });
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE calendar-mark error:", error);
    return NextResponse.json({ error: "Failed to delete calendar mark" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Activity } from "@/models/Activity";

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
      startTime,
      endTime,
      energyLevel = "medium",
      notes,
    } = body;

    if (!title || !category || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "title, category, date, startTime, endTime are required" },
        { status: 400 }
      );
    }

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const duration = eh * 60 + em - (sh * 60 + sm);
    const durationHours = Math.round((duration / 60) * 100) / 100;

    const activity = await Activity.create({
      userId,
      title,
      category,
      tags: Array.isArray(tags) ? tags : [],
      date: new Date(date),
      startTime,
      endTime,
      duration: durationHours,
      energyLevel: ["low", "medium", "high"].includes(energyLevel)
        ? energyLevel
        : "medium",
      notes: notes ?? "",
    });

    return NextResponse.json({
      ...activity.toObject(),
      _id: activity._id.toString(),
      userId: activity.userId.toString(),
      date: activity.date.toISOString().slice(0, 10),
    });
  } catch (error) {
    console.error("POST activity error:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}

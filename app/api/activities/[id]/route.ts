import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Activity } from "@/models/Activity";

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function GET(
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
    const activity = await Activity.findOne({ _id: id, userId });
    if (!activity) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...activity.toObject(),
      _id: activity._id.toString(),
      userId: activity.userId.toString(),
      date: activity.date.toISOString().slice(0, 10),
    });
  } catch (error) {
    console.error("GET activity error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
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
    const body = await request.json();
    const activity = await Activity.findOne({ _id: id, userId });
    if (!activity) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const {
      title,
      category,
      tags,
      date,
      startTime,
      endTime,
      energyLevel,
      notes,
    } = body;

    if (title !== undefined) activity.title = title;
    if (category !== undefined) activity.category = category;
    if (tags !== undefined) activity.tags = Array.isArray(tags) ? tags : [];
    if (date !== undefined) activity.date = new Date(date);
    if (startTime !== undefined) activity.startTime = startTime;
    if (endTime !== undefined) activity.endTime = endTime;
    if (energyLevel !== undefined && ["low", "medium", "high"].includes(energyLevel)) {
      activity.energyLevel = energyLevel;
    }
    if (notes !== undefined) activity.notes = notes;

    if (
      activity.startTime &&
      activity.endTime
    ) {
      const [sh, sm] = activity.startTime.split(":").map(Number);
      const [eh, em] = activity.endTime.split(":").map(Number);
      activity.duration = Math.round((eh * 60 + em - (sh * 60 + sm)) / 60 * 100) / 100;
    }

    await activity.save();

    return NextResponse.json({
      ...activity.toObject(),
      _id: activity._id.toString(),
      userId: activity.userId.toString(),
      date: activity.date.toISOString().slice(0, 10),
    });
  } catch (error) {
    console.error("PUT activity error:", error);
    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 }
    );
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
    const result = await Activity.findOneAndDelete({ _id: id, userId });
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE activity error:", error);
    return NextResponse.json(
      { error: "Failed to delete activity" },
      { status: 500 }
    );
  }
}

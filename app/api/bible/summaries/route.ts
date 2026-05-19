import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { BibleJourney } from "@/models/BibleJourney";
import { buildTodayReadings, getTodayKey } from "@/lib/biblePlan";
import { markReferenceReadToday } from "@/lib/bibleReadProgress";

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
    const reference = typeof body?.reference === "string" ? body.reference.trim() : "";
    const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
    if (!reference || !summary) {
      return NextResponse.json({ error: "reference and summary are required" }, { status: 400 });
    }

    await connectDB();
    const journey = await BibleJourney.findOne({ userId });
    if (!journey) {
      return NextResponse.json({ error: "Plan not initialized" }, { status: 400 });
    }

    const duplicate = (journey.chapterSummaries ?? []).find(
      (s) => s.reference === reference && s.summary === summary
    );
    if (duplicate) {
      return NextResponse.json({ ok: true, alreadySaved: true });
    }

    journey.chapterSummaries = [
      ...(journey.chapterSummaries ?? []),
      { reference, summary, createdAt: new Date().toISOString() },
    ];

    const today = getTodayKey();
    const plan = buildTodayReadings(journey);
    const readKey = markReferenceReadToday(journey, today, reference, plan.readings);

    await journey.save();
    return NextResponse.json({ ok: true, readKey });
  } catch (error) {
    console.error("POST bible/summaries error:", error);
    return NextResponse.json({ error: "Failed to save chapter summary" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await connectDB();
    const journey = await BibleJourney.findOne({ userId });
    if (!journey) {
      return NextResponse.json({ error: "Plan not initialized" }, { status: 400 });
    }

    journey.chapterSummaries = (journey.chapterSummaries ?? []).filter(
      (s) => String((s as { _id?: string })._id) !== id
    );
    await journey.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE bible/summaries error:", error);
    return NextResponse.json({ error: "Failed to delete chapter summary" }, { status: 500 });
  }
}


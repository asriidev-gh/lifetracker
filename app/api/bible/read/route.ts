import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { BibleJourney } from "@/models/BibleJourney";
import { buildTodayReadings, getTodayKey } from "@/lib/biblePlan";
import {
  findReadingKeyForReference,
  getTodayReadKeys,
  setTodayReadKey,
} from "@/lib/bibleReadProgress";

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
    const read = body?.read !== false;
    const key =
      typeof body?.key === "string" && body.key.includes("::") ? body.key.trim() : "";

    if (!reference && !key) {
      return NextResponse.json({ error: "reference or key is required" }, { status: 400 });
    }

    await connectDB();
    const journey = await BibleJourney.findOne({ userId });
    if (!journey) {
      return NextResponse.json({ error: "Plan not initialized" }, { status: 400 });
    }

    const today = getTodayKey();
    const plan = buildTodayReadings(journey);
    const resolvedKey =
      key || (reference ? findReadingKeyForReference(reference, plan.readings) : null);
    if (!resolvedKey) {
      return NextResponse.json({ error: "Reading not found for today" }, { status: 400 });
    }

    setTodayReadKey(journey, today, resolvedKey, read);
    await journey.save();

    return NextResponse.json({
      ok: true,
      readKey: resolvedKey,
      readItemKeys: getTodayReadKeys(journey, today, plan.readings),
    });
  } catch (error) {
    console.error("POST bible/read error:", error);
    return NextResponse.json({ error: "Failed to update read status" }, { status: 500 });
  }
}

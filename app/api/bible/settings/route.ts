import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { BibleJourney } from "@/models/BibleJourney";

export async function PATCH(request: Request) {
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
    await connectDB();
    const journey = await BibleJourney.findOne({ userId });
    if (!journey) {
      return NextResponse.json({ error: "Plan not initialized" }, { status: 400 });
    }

    if (typeof body.catchUpMode === "boolean") {
      journey.catchUpMode = body.catchUpMode;
    }
    if (typeof body.reminderEnabled === "boolean") {
      journey.reminderEnabled = body.reminderEnabled;
    }
    if (typeof body.reminderTime === "string") {
      journey.reminderTime = body.reminderTime;
    }
    if (
      typeof body.planType === "string" &&
      ["straight", "mixed", "chronological"].includes(body.planType)
    ) {
      const nextPlanType = body.planType as "straight" | "mixed" | "chronological";
      const changed = journey.planType !== nextPlanType;
      journey.planType = nextPlanType;
      if (changed) {
        journey.otBookIdx = 0;
        journey.otChapter = 1;
        journey.ntBookIdx = 0;
        journey.ntChapter = 1;
        journey.wisdomTrack = "psalms";
        journey.wisdomChapter = 1;
        journey.straightBookIdx = 0;
        journey.straightChapter = 1;
        journey.chronologicalBookIdx = 0;
        journey.chronologicalChapter = 1;
        journey.completedChapters = 0;
        journey.currentStreak = 0;
        journey.bestStreak = 0;
        journey.lastCompletedDate = undefined;
        journey.completedDays = [];
        journey.readingHistory = [];
        journey.aiConversations = [];
        journey.chapterSummaries = [];
      }
    }
    if (body.resetProgress === true) {
      journey.otBookIdx = 0;
      journey.otChapter = 1;
      journey.ntBookIdx = 0;
      journey.ntChapter = 1;
      journey.wisdomTrack = "psalms";
      journey.wisdomChapter = 1;
      journey.straightBookIdx = 0;
      journey.straightChapter = 1;
      journey.chronologicalBookIdx = 0;
      journey.chronologicalChapter = 1;
      journey.completedChapters = 0;
      journey.currentStreak = 0;
      journey.bestStreak = 0;
      journey.lastCompletedDate = undefined;
      journey.completedDays = [];
      journey.readingHistory = [];
      journey.aiConversations = [];
      journey.chapterSummaries = [];
    }

    await journey.save();
    return NextResponse.json({
      planType: journey.planType,
      catchUpMode: journey.catchUpMode,
      reminderEnabled: journey.reminderEnabled,
      reminderTime: journey.reminderTime,
    });
  } catch (error) {
    console.error("PATCH bible/settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

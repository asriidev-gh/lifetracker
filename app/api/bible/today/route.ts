import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { BibleJourney } from "@/models/BibleJourney";
import { buildTodayReadings, getTodayKey } from "@/lib/biblePlan";

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

    let journey = await BibleJourney.findOne({ userId });
    if (!journey) {
      const startDate = new Date();
      const targetDate = new Date(startDate);
      targetDate.setDate(startDate.getDate() + 364);

      journey = await BibleJourney.create({
        userId,
        startDate,
        targetDate,
      });
    }

    const plan = buildTodayReadings(journey);
    const today = getTodayKey();
    const completedToday = (journey.completedDays ?? []).includes(today);
    const recentHistory = [...(journey.readingHistory ?? [])]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14);
    const savedScriptures = [...(journey.savedScriptures ?? [])]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 100);
    const qaHistory = [...(journey.aiConversations ?? [])]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 50);
    const summaryHistory = [...(journey.chapterSummaries ?? [])]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 50);
    const vocabulary = [...(journey.vocabulary ?? [])]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 200);

    return NextResponse.json({
      today,
      completedToday,
      streak: {
        current: journey.currentStreak ?? 0,
        best: journey.bestStreak ?? 0,
      },
      planType: journey.planType ?? "mixed",
      catchUpMode: journey.catchUpMode,
      reminderEnabled: journey.reminderEnabled,
      reminderTime: journey.reminderTime,
      targetDate:
        journey.targetDate instanceof Date
          ? journey.targetDate.toISOString().slice(0, 10)
          : String(journey.targetDate),
      chapterTarget: plan.chapterTarget,
      daysLeft: plan.daysLeft,
      remainingChapters: plan.remainingChapters,
      readings: plan.readings,
      history: recentHistory,
      savedScriptures,
      qaHistory,
      summaryHistory,
      vocabulary,
    });
  } catch (error) {
    console.error("GET bible/today error:", error);
    return NextResponse.json({ error: "Failed to fetch today's plan" }, { status: 500 });
  }
}

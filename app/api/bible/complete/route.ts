import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { BibleJourney } from "@/models/BibleJourney";
import { Activity } from "@/models/Activity";
import { buildTodayReadings, getTodayKey } from "@/lib/biblePlan";

function dayDiff(a: string, b: string) {
  const ms = 24 * 60 * 60 * 1000;
  const at = new Date(`${a}T00:00:00.000Z`).getTime();
  const bt = new Date(`${b}T00:00:00.000Z`).getTime();
  return Math.round((at - bt) / ms);
}

export async function POST() {
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
    const journey = await BibleJourney.findOne({ userId });
    if (!journey) {
      return NextResponse.json({ error: "Plan not initialized" }, { status: 400 });
    }

    const today = getTodayKey();
    const completedToday = (journey.completedDays ?? []).includes(today);
    if (completedToday && !journey.catchUpMode) {
      return NextResponse.json({ ok: true, alreadyCompleted: true });
    }

    const plan = buildTodayReadings(journey);
    if (typeof plan.nextPointers.otBookIdx === "number") journey.otBookIdx = plan.nextPointers.otBookIdx;
    if (typeof plan.nextPointers.otChapter === "number") journey.otChapter = plan.nextPointers.otChapter;
    if (typeof plan.nextPointers.ntBookIdx === "number") journey.ntBookIdx = plan.nextPointers.ntBookIdx;
    if (typeof plan.nextPointers.ntChapter === "number") journey.ntChapter = plan.nextPointers.ntChapter;
    if (typeof plan.nextPointers.wisdomTrack === "string") journey.wisdomTrack = plan.nextPointers.wisdomTrack;
    if (typeof plan.nextPointers.wisdomChapter === "number") journey.wisdomChapter = plan.nextPointers.wisdomChapter;
    if (typeof plan.nextPointers.straightBookIdx === "number") journey.straightBookIdx = plan.nextPointers.straightBookIdx;
    if (typeof plan.nextPointers.straightChapter === "number") journey.straightChapter = plan.nextPointers.straightChapter;
    if (typeof plan.nextPointers.chronologicalBookIdx === "number") journey.chronologicalBookIdx = plan.nextPointers.chronologicalBookIdx;
    if (typeof plan.nextPointers.chronologicalChapter === "number") journey.chronologicalChapter = plan.nextPointers.chronologicalChapter;
    journey.completedChapters = (journey.completedChapters ?? 0) + plan.readings.length;
    const readingRefs = plan.readings.map((r) => r.reference);
    const history = journey.readingHistory ?? [];
    const historyIdx = history.findIndex((entry) => entry.date === today);
    if (historyIdx >= 0) {
      const merged = [...history[historyIdx].readings, ...readingRefs];
      history[historyIdx].readings = merged;
      history[historyIdx].totalReadings = merged.length;
    } else {
      history.push({
        date: today,
        readings: readingRefs,
        totalReadings: readingRefs.length,
      });
    }
    journey.readingHistory = history;

    await Activity.create({
      userId,
      title: "Bible Reading Completed",
      category: "Spiritual",
      tags: ["Bible", "Reading Plan"],
      date: new Date(`${today}T00:00:00.000Z`),
      startTime: "06:00",
      endTime: "06:30",
      duration: 0.5,
      energyLevel: "medium",
      notes: readingRefs.join(", "),
    });

    if (!completedToday) {
      journey.completedDays = [...(journey.completedDays ?? []), today];
    }

    // Streak changes at most once per day.
    if (!completedToday) {
      const last = journey.lastCompletedDate;
      if (!last) {
        journey.currentStreak = 1;
      } else {
        const diff = dayDiff(today, last);
        if (diff === 1) {
          journey.currentStreak = (journey.currentStreak ?? 0) + 1;
        } else if (diff > 1) {
          journey.currentStreak = 1;
        }
      }
      journey.bestStreak = Math.max(journey.bestStreak ?? 0, journey.currentStreak ?? 0);
      journey.lastCompletedDate = today;
    }

    await journey.save();
    return NextResponse.json({ ok: true, currentStreak: journey.currentStreak });
  } catch (error) {
    console.error("POST bible/complete error:", error);
    return NextResponse.json({ error: "Failed to mark complete" }, { status: 500 });
  }
}

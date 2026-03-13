import { requireAuth } from "@/lib/getSession";
import { connectDB } from "@/lib/mongodb";
import { Activity } from "@/models/Activity";
import { startOfWeek, endOfWeek, getDay } from "date-fns";
import { InsightsList } from "./InsightsList";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function InsightsPage() {
  const session = await requireAuth();
  const userId = session.user.id;
  await connectDB();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const weekActivities = await Activity.find({
    userId,
    date: { $gte: weekStart, $lte: weekEnd },
  }).lean();

  const byCategory = weekActivities.reduce<Record<string, { count: number; hours: number }>>(
    (acc, a) => {
      if (!acc[a.category]) acc[a.category] = { count: 0, hours: 0 };
      acc[a.category].count += 1;
      acc[a.category].hours += a.duration ?? 0;
      return acc;
    },
    {}
  );

  const byDay = weekActivities.reduce<Record<number, number>>((acc, a) => {
    const d = a.date instanceof Date ? a.date : new Date(a.date);
    const day = getDay(d);
    acc[day] = (acc[day] ?? 0) + (a.duration ?? 0);
    return acc;
  }, {});

  const totalHours = weekActivities.reduce((s, a) => s + (a.duration ?? 0), 0);
  const mostFrequentCategory = Object.entries(byCategory).sort(
    (a, b) => b[1].count - a[1].count
  )[0]?.[0] ?? "—";
  const mostActiveDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  const mostActiveDayName = mostActiveDay
    ? DAY_NAMES[Number(mostActiveDay[0])]
    : "—";

  const exerciseCount = (byCategory["Sports"]?.count ?? 0);
  const workHours = (byCategory["Work"]?.hours ?? 0);

  const insights = [
    exerciseCount > 0 &&
      `You exercised ${exerciseCount} time${exerciseCount === 1 ? "" : "s"} this week.`,
    workHours > 0 && `You worked ${Math.round(workHours * 10) / 10} hours this week.`,
    `Most frequent activity category: ${mostFrequentCategory}`,
    `Most active day: ${mostActiveDayName}`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Insights</h1>
        <p className="text-muted-foreground">
          Auto-generated from your activity data
        </p>
      </div>
      <InsightsList insights={insights} totalHours={totalHours} />
    </div>
  );
}

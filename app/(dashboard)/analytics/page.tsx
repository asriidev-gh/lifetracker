import { requireAuth } from "@/lib/getSession";
import { connectDB } from "@/lib/mongodb";
import { Activity } from "@/models/Activity";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  format,
} from "date-fns";
import { AnalyticsCharts } from "./AnalyticsCharts";

export default async function AnalyticsPage() {
  const session = await requireAuth();
  const userId = session.user.id;
  await connectDB();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [weeklyActivities, monthlyActivities, last4Weeks] = await Promise.all([
    Activity.find({
      userId,
      date: { $gte: weekStart, $lte: weekEnd },
    }).lean(),
    Activity.find({
      userId,
      date: { $gte: monthStart, $lte: monthEnd },
    }).lean(),
    Promise.all(
      [0, 1, 2, 3].map((i) => {
        const s = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const e = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        return Activity.find({
          userId,
          date: { $gte: s, $lte: e },
        }).lean();
      })
    ),
  ]);

  const weeklyByCategory = Object.entries(
    weeklyActivities.reduce<Record<string, number>>((acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + (a.duration ?? 0);
      return acc;
    }, {})
  ).map(([name, hours]) => ({ name, hours: Math.round(hours * 100) / 100 }));

  const monthlyByCategory = Object.entries(
    monthlyActivities.reduce<Record<string, number>>((acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + (a.duration ?? 0);
      return acc;
    }, {})
  ).map(([name, hours]) => ({ name, hours: Math.round(hours * 100) / 100 }));

  const weeklyTrend = last4Weeks.map((week, i) => {
    const total = week.reduce((s, a) => s + (a.duration ?? 0), 0);
    const weekStartDate = startOfWeek(subWeeks(now, 3 - i), { weekStartsOn: 1 });
    return {
      name: `Week ${format(weekStartDate, "MMM d")}`,
      hours: Math.round(total * 100) / 100,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Weekly and monthly breakdowns
        </p>
      </div>
      <AnalyticsCharts
        weeklyByCategory={weeklyByCategory}
        monthlyByCategory={monthlyByCategory}
        weeklyTrend={weeklyTrend}
      />
    </div>
  );
}

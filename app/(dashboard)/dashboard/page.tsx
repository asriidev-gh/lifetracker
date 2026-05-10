import { connectDB } from "@/lib/mongodb";
import { Activity } from "@/models/Activity";
import { Todo } from "@/models/Todo";
import { requireAuth } from "@/lib/getSession";
import { format, startOfDay, endOfDay } from "date-fns";
import { DashboardCards } from "./DashboardCards";
import { CategoryChart } from "@/components/charts/CategoryChart";
import { LifeScoreCard } from "@/components/LifeScoreCard";
import { ProductivitySummary } from "@/components/ProductivitySummary";

export default async function DashboardPage() {
  const session = await requireAuth();
  const userId = session.user.id;
  await connectDB();

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const todayRaw = await Activity.find({
    userId,
    date: { $gte: todayStart, $lte: todayEnd },
  })
    .sort({ startTime: 1 })
    .lean();
  const todayActivities = todayRaw.map((a) => ({
    _id: a._id.toString(),
    userId: a.userId.toString(),
    title: a.title,
    category: a.category,
    tags: a.tags ?? [],
    date: a.date instanceof Date ? a.date.toISOString().slice(0, 10) : String(a.date).slice(0, 10),
    startTime: a.startTime,
    endTime: a.endTime,
    duration: a.duration ?? 0,
    energyLevel: a.energyLevel ?? "medium",
    notes: a.notes,
  }));

  const totalHoursToday =
    todayActivities.reduce((sum, a) => sum + (a.duration ?? 0), 0);
  const overdueTodos = await Todo.countDocuments({
    userId,
    completed: false,
    dueDate: { $lt: todayStart },
  });
  const openTodos = await Todo.countDocuments({ userId, completed: false });

  const byCategory = todayActivities.reduce<Record<string, number>>(
    (acc, a) => {
      acc[a.category] = (acc[a.category] ?? 0) + (a.duration ?? 0);
      return acc;
    },
    {}
  );

  const categoryBreakdown = Object.entries(byCategory).map(([name, hours]) => ({
    name,
    hours: Math.round(hours * 100) / 100,
    fill: `hsl(var(--primary))`,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCards
          totalHoursToday={totalHoursToday}
          todayActivities={todayActivities}
        />
      </div>

      {(overdueTodos > 0 || openTodos > 0) && (
        <div className="rounded-lg border bg-card p-4">
          <p className="font-medium">
            To Do reminder:{" "}
            {overdueTodos > 0
              ? `You have ${overdueTodos} overdue ${overdueTodos === 1 ? "task" : "tasks"}`
              : `You have ${openTodos} open ${openTodos === 1 ? "task" : "tasks"}`}.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your remaining tasks in the To Do section.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryChart data={categoryBreakdown} title="Today's category breakdown" />
        <LifeScoreCard activities={todayActivities} />
      </div>

      <ProductivitySummary activities={todayActivities} />
    </div>
  );
}

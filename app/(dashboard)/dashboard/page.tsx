import { connectDB } from "@/lib/mongodb";
import { Activity } from "@/models/Activity";
import { Todo } from "@/models/Todo";
import { requireAuth } from "@/lib/getSession";
import { addDays, endOfDay, format, startOfDay } from "date-fns";
import { resolveDashboardView } from "@/lib/dashboardView";
import { buildDashboardInsights } from "@/lib/buildDashboardInsights";
import { DashboardCards } from "./DashboardCards";
import { DashboardDateNav } from "./DashboardDateNav";
import { DashboardInsightsModal } from "./DashboardInsightsModal";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { date?: string; range?: string; insights?: string };
}) {
  const session = await requireAuth();
  const userId = session.user.id;
  await connectDB();

  const view = resolveDashboardView(searchParams);
  const todayStart = startOfDay(new Date());
  const todayKey = format(todayStart, "yyyy-MM-dd");

  const raw = await Activity.find({
    userId,
    date: { $gte: view.rangeStart, $lte: view.rangeEnd },
  })
    .sort({ date: 1, startTime: 1 })
    .lean();

  const activities = raw.map((a) => ({
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

  const totalHours = activities.reduce((sum, a) => sum + (a.duration ?? 0), 0);
  const overdueTodos = await Todo.countDocuments({
    userId,
    completed: false,
    dueDate: { $lt: todayStart },
  });
  const openTodos = await Todo.countDocuments({ userId, completed: false });

  const upcomingStart = startOfDay(addDays(todayStart, 1));
  const upcomingEnd = endOfDay(addDays(todayStart, 7));
  const upcomingRaw = await Activity.find({
    userId,
    date: { $gte: upcomingStart, $lte: upcomingEnd },
  })
    .sort({ date: 1, startTime: 1 })
    .limit(80)
    .lean();

  const upcomingPreview = upcomingRaw.map((a) => ({
    _id: a._id.toString(),
    title: a.title,
    category: a.category ?? "Uncategorized",
    date: a.date instanceof Date ? a.date.toISOString().slice(0, 10) : String(a.date).slice(0, 10),
    startTime: a.startTime,
  }));

  const chartFills = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];
  /** Insights modal excludes future-dated rows so charts and bullets match “through today”. */
  const insightsActivities = activities.filter((a) => a.date.slice(0, 10) <= todayKey);
  const byCategoryInsights = insightsActivities.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + (a.duration ?? 0);
    return acc;
  }, {});
  const categoryBreakdownInsights = Object.entries(byCategoryInsights).map(([name, hours], i) => ({
    name,
    hours: Math.round(hours * 100) / 100,
    fill: chartFills[i % chartFills.length],
  }));

  const isRange = view.mode === "range";
  const mainHeading =
    view.mode === "day"
      ? format(view.viewDate, "EEEE, MMMM d, yyyy")
      : view.rangeHeading;

  const showTodoNote = view.mode === "day" ? !view.isToday : true;

  const categoryTitle =
    view.mode === "day"
      ? view.isToday
        ? "Today's category breakdown"
        : `Category breakdown · ${format(view.viewDate, "MMM d, yyyy")}`
      : `Category breakdown · ${view.periodLabel}`;

  const balanceDescription =
    view.mode === "day"
      ? view.isToday
        ? "Balance across life pillars today"
        : `Balance across life pillars on ${format(view.viewDate, "MMM d, yyyy")}`
      : `Balance across life pillars · ${view.periodLabel}`;

  const productivityTitle =
    view.mode === "day"
      ? view.isToday
        ? "Productivity today"
        : `Productivity · ${format(view.viewDate, "MMM d, yyyy")}`
      : `Productivity · ${view.periodLabel}`;

  const dashboardScopeLabel =
    view.mode === "range"
      ? view.periodLabel
      : view.isToday
        ? "Today"
        : format(view.viewDate, "MMM d, yyyy");

  const { insights: dashboardInsights, totalHours: insightsTotalHours } = buildDashboardInsights(
    insightsActivities.map((a) => ({
      category: a.category,
      duration: a.duration,
      date: a.date,
    })),
    dashboardScopeLabel
  );

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-dashboard-hero-border bg-dashboard-hero p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 gap-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
              <DashboardInsightsModal
                categoryBreakdown={categoryBreakdownInsights}
                categoryTitle={categoryTitle}
                activities={insightsActivities}
                balanceDescription={balanceDescription}
                productivityTitle={productivityTitle}
                scopeLabel={dashboardScopeLabel}
                insights={dashboardInsights}
                insightsTotalHours={insightsTotalHours}
                initialOpen={searchParams.insights === "1"}
              />
            </div>
            <p className="mt-0.5 text-muted-foreground">{mainHeading}</p>
            {showTodoNote ? (
              <p className="mt-2 text-sm text-muted-foreground">
                To-do, calendar, and logged-activity blocks above Total hours: reminders use <span className="font-medium">right now</span>{" "}
                (next 7 days for calendar), not the dashboard date or range below. When you hide a section, it becomes a
                small icon with a count; click the icon to expand again.
              </p>
            ) : null}
          </div>
          <DashboardDateNav
            activeRange={isRange ? view.rangeSlug : null}
            dateKey={view.mode === "day" ? view.dateKey : format(todayStart, "yyyy-MM-dd")}
          />
        </div>
      </div>

      <DashboardCards
        totalHours={totalHours}
        activities={activities}
        variant={isRange ? "range" : "day"}
        overdueTodos={overdueTodos}
        openTodos={openTodos}
        upcomingPreview={upcomingPreview}
        dashboardScopeLabel={dashboardScopeLabel}
      />
    </div>
  );
}

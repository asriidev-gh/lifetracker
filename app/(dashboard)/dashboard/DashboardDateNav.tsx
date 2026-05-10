"use client";

import { format } from "date-fns";
import { usePathname, useRouter } from "next/navigation";
import { DASHBOARD_PRESETS, type DashboardRangeSlug } from "@/lib/dashboardView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DashboardDateNav({
  activeRange,
  dateKey,
}: {
  activeRange: DashboardRangeSlug | null;
  dateKey: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const isDefaultView = activeRange === null && dateKey === todayKey;

  function goRange(slug: DashboardRangeSlug) {
    router.push(`${pathname}?range=${slug}`);
  }

  function goToday() {
    router.push(pathname);
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-3 rounded-xl border border-dashboard-hero-border bg-dashboard-panel p-3 shadow-sm sm:max-w-none sm:items-end sm:p-4">
      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        {DASHBOARD_PRESETS.map(({ slug, label }) => (
          <Button
            key={slug}
            type="button"
            size="sm"
            variant={activeRange === slug ? "default" : "outline"}
            className="text-xs sm:text-sm"
            onClick={() => goRange(slug)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <label htmlFor="dashboard-date" className="text-sm text-muted-foreground">
          Pick a day
        </label>
        <Input
          id="dashboard-date"
          type="date"
          className="w-auto max-w-[11rem] border-dashboard-hero-border bg-dashboard-panel-muted"
          value={activeRange ? "" : dateKey}
          max={todayKey}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            if (v === todayKey) {
              goToday();
            } else {
              router.push(`${pathname}?date=${encodeURIComponent(v)}`);
            }
          }}
        />
        {!isDefaultView ? (
          <Button type="button" variant="outline" size="sm" onClick={() => goToday()}>
            Jump to today
          </Button>
        ) : null}
      </div>
      <p className="text-right text-xs text-muted-foreground">Week presets use Monday as the first day of the week.</p>
    </div>
  );
}

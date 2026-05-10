"use client";

import { useEffect, useState } from "react";
import { CategoryChart } from "@/components/charts/CategoryChart";
import { LifeScoreCard } from "@/components/LifeScoreCard";
import { ProductivitySummary } from "@/components/ProductivitySummary";
import { InsightsList } from "@/components/InsightsList";
import { HeatmapView } from "@/components/HeatmapView";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActivityRecord } from "@/types/activity";
import { Sparkles } from "lucide-react";

export type CategoryBreakdownItem = {
  name: string;
  hours: number;
  fill: string;
};

type DashboardInsightsModalProps = {
  categoryBreakdown: CategoryBreakdownItem[];
  categoryTitle: string;
  activities: ActivityRecord[];
  balanceDescription: string;
  productivityTitle: string;
  scopeLabel: string;
  insights: string[];
  insightsTotalHours: number;
  /** When true (e.g. `/dashboard?insights=1`), open the dialog on load */
  initialOpen?: boolean;
};

export function DashboardInsightsModal({
  categoryBreakdown,
  categoryTitle,
  activities,
  balanceDescription,
  productivityTitle,
  scopeLabel,
  insights,
  insightsTotalHours,
  initialOpen = false,
}: DashboardInsightsModalProps) {
  const [open, setOpen] = useState(initialOpen);

  useEffect(() => {
    setOpen(initialOpen);
  }, [initialOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            badgeVariants({ variant: "secondary" }),
            "cursor-pointer gap-1.5 border border-primary/25 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Insights
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[min(90vh,900px)] max-w-5xl overflow-y-auto"
        showClose
      >
        <DialogHeader>
          <DialogTitle>Insights</DialogTitle>
          <DialogDescription>
            Auto-generated notes, charts, productivity, and a 12-week activity heatmap for{" "}
            <span className="font-medium text-foreground">{scopeLabel}</span>
            . Future dates in the range are excluded; charts and bullets are through today only.
            The heatmap always shows the last 12 weeks of logged hours.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          <InsightsList
            insights={insights}
            totalHours={insightsTotalHours}
            periodLabel={scopeLabel}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryChart data={categoryBreakdown} title={categoryTitle} />
            <LifeScoreCard activities={activities} balanceDescription={balanceDescription} />
          </div>
          <ProductivitySummary activities={activities} title={productivityTitle} />
          <HeatmapView />
        </div>
      </DialogContent>
    </Dialog>
  );
}

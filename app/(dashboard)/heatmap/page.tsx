import { HeatmapView } from "./HeatmapView";

export default function HeatmapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity heatmap</h1>
        <p className="text-muted-foreground">
          GitHub-style intensity by day (last 12 weeks)
        </p>
      </div>
      <HeatmapView />
    </div>
  );
}

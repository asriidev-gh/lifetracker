"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export function InsightsList({
  insights,
  totalHours,
}: {
  insights: string[];
  totalHours: number;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-primary" />
            This week
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Total: {totalHours.toFixed(1)}h logged
          </p>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add activities to see insights.
            </p>
          ) : (
            <ul className="space-y-3">
              {insights.map((text, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm"
                >
                  <span className="text-primary">•</span>
                  {text}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

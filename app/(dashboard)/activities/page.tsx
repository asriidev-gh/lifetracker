import { Suspense } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivitiesList } from "./ActivitiesList";
import { ActivitiesFilters } from "./ActivitiesFilters";

export default function ActivitiesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
          <p className="text-muted-foreground">
            View, filter, and manage your activities
          </p>
        </div>
        <Button asChild className="shrink-0 gap-2 self-end sm:self-start">
          <Link href="/activities/add">
            <PlusCircle className="h-4 w-4" />
            Add activity
          </Link>
        </Button>
      </div>
      <Suspense fallback={<div className="h-24 animate-pulse rounded-lg border bg-muted/50" aria-hidden />}>
        <ActivitiesFilters />
      </Suspense>
      <ActivitiesList />
    </div>
  );
}

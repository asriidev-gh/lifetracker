import { ActivitiesList } from "./ActivitiesList";
import { ActivitiesFilters } from "./ActivitiesFilters";

export default function ActivitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
        <p className="text-muted-foreground">
          View, filter, and manage your activities
        </p>
      </div>
      <ActivitiesFilters />
      <ActivitiesList />
    </div>
  );
}

import { requireAuth } from "@/lib/getSession";
import { BiblePlanner } from "./BiblePlanner";

export default async function BiblePage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bible Journey</h1>
        <p className="text-muted-foreground">
          Read daily, stay consistent, and finish the Bible with a balanced one-year journey.
        </p>
      </div>
      <BiblePlanner />
    </div>
  );
}

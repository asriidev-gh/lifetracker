import Link from "next/link";
import { ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarView } from "./CalendarView";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">
            View your activities by month
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0 gap-2 self-end sm:self-start">
          <Link href="/activities">
            <ListTodo className="h-4 w-4" />
            Activities list
          </Link>
        </Button>
      </div>
      <CalendarView />
    </div>
  );
}

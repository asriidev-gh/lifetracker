"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useActivityStore } from "@/store/activityStore";
import { ActivityRecord } from "@/types/activity";
import { EditActivityDialog } from "./EditActivityDialog";

export function ActivitiesList() {
  const activities = useActivityStore((s) => s.activities);
  const setActivities = useActivityStore((s) => s.setActivities);
  const removeActivity = useActivityStore((s) => s.removeActivity);
  const [editing, setEditing] = useState<ActivityRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activities")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setActivities(data);
      })
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [setActivities]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this activity?")) return;
    const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
    if (res.ok) removeActivity(id);
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (activities.length === 0) {
    return (
      <p className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        No activities found. Add one from the sidebar or dashboard.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((a) => (
              <TableRow key={a._id}>
                <TableCell className="font-medium">{a.date}</TableCell>
                <TableCell>{a.title}</TableCell>
                <TableCell>{a.category}</TableCell>
                <TableCell>
                  {a.startTime} – {a.endTime}
                </TableCell>
                <TableCell>{a.duration}h</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(a)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(a._id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editing && (
        <EditActivityDialog
          activity={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}
    </>
  );
}

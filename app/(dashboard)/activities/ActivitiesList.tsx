"use client";

import { useState } from "react";
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
import Swal from "sweetalert2";
import { useActivityStore } from "@/store/activityStore";
import { ActivityRecord } from "@/types/activity";
import { EditActivityDialog } from "./EditActivityDialog";

export function ActivitiesList() {
  const activities = useActivityStore((s) => s.activities);
  const removeActivity = useActivityStore((s) => s.removeActivity);
  const [editing, setEditing] = useState<ActivityRecord | null>(null);

  async function handleDelete(id: string) {
    const decision = await Swal.fire({
      icon: "warning",
      title: "Delete this activity?",
      text: "This cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!decision.isConfirmed) return;

    try {
      const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
      if (res.ok) {
        removeActivity(id);
        await Swal.fire({
          icon: "success",
          title: "Activity deleted",
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      await Swal.fire({
        icon: "error",
        title: data?.error ?? "Could not delete activity",
        timer: 2200,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    } catch {
      await Swal.fire({
        icon: "error",
        title: "Something went wrong",
        timer: 2200,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    }
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
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((a) => (
              <TableRow key={a._id}>
                <TableCell className="font-medium">{a.date}</TableCell>
                <TableCell>{a.title}</TableCell>
                <TableCell>{a.category}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {a.category === "Finance" && a.amount != null
                    ? a.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })
                    : "—"}
                </TableCell>
                <TableCell>
                  {a.startTime} – {a.endTime}
                </TableCell>
                <TableCell>{a.duration}h</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {a.notes && a.notes.trim().length > 0 ? a.notes : "—"}
                </TableCell>
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
                        onClick={() => void handleDelete(a._id)}
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
          key={editing._id}
          activity={editing}
          open={!!editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MARK_COLOR_OPTIONS, getMarkChipClass } from "@/lib/calendarMarkColors";
import { recurrenceLabel, resolveMarkId } from "@/lib/calendarMarkRecurrence";
import type { CalendarMarkRecord, CalendarMarkRecurrence } from "@/types/calendarMark";
import { EditCalendarMarkDialog } from "./EditCalendarMarkDialog";
import { Pencil, Plus, Trash2, X } from "lucide-react";

const RECURRENCE_OPTIONS: CalendarMarkRecurrence[] = ["one-time", "weekly", "monthly"];

type DraftRow = {
  id: string;
  date: string;
  title: string;
  details: string;
  colorKey: string;
  recurrence: CalendarMarkRecurrence;
};

function newRow(): DraftRow {
  return {
    id: crypto.randomUUID(),
    date: "",
    title: "",
    details: "",
    colorKey: "sky",
    recurrence: "one-time",
  };
}

type MarkRecurringEventsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function MarkRecurringEventsDialog({
  open,
  onOpenChange,
  onSaved,
}: MarkRecurringEventsDialogProps) {
  const [rows, setRows] = useState<DraftRow[]>([newRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showExisting, setShowExisting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingMarks, setExistingMarks] = useState<CalendarMarkRecord[]>([]);
  const [existingError, setExistingError] = useState("");
  const [editingMark, setEditingMark] = useState<CalendarMarkRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function reset() {
    setRows([newRow()]);
    setError("");
    setShowExisting(false);
    setLoadingExisting(false);
    setExistingMarks([]);
    setExistingError("");
    setEditingMark(null);
    setDeletingId(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function addRow() {
    setRows((r) => [...r, newRow()]);
  }

  function removeRow(id: string) {
    setRows((r) => (r.length <= 1 ? r : r.filter((x) => x.id !== id)));
  }

  function updateRow(id: string, patch: Partial<DraftRow>) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function loadExistingMarks() {
    setLoadingExisting(true);
    setExistingError("");
    try {
      const res = await fetch("/api/calendar-marks");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setExistingError(
          typeof data?.error === "string" ? data.error : "Could not load recurring events"
        );
        return;
      }
      setExistingMarks(Array.isArray(data) ? (data as CalendarMarkRecord[]) : []);
    } catch {
      setExistingError("Could not load recurring events");
    } finally {
      setLoadingExisting(false);
    }
  }

  async function toggleExistingMarks() {
    const next = !showExisting;
    setShowExisting(next);
    if (next && existingMarks.length === 0 && !loadingExisting) {
      await loadExistingMarks();
    }
  }

  async function deleteExistingMark(mark: CalendarMarkRecord) {
    const id = resolveMarkId(mark.sourceId ?? mark._id);
    setDeletingId(id);
    setExistingError("");
    try {
      const res = await fetch(`/api/calendar-marks/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setExistingError(
          typeof data?.error === "string" ? data.error : "Could not delete event"
        );
        return;
      }
      await loadExistingMarks();
      onSaved();
    } catch {
      setExistingError("Could not delete event");
    } finally {
      setDeletingId(null);
    }
  }

  function handleMarkEdited() {
    void loadExistingMarks();
    onSaved();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const marks = rows
      .map((row) => ({
        date: row.date.trim(),
        title: row.title.trim(),
        details: row.details.trim() || undefined,
        colorKey: row.colorKey,
        recurrence: row.recurrence,
      }))
      .filter((m) => m.date && m.title);

    if (marks.length === 0) {
      setError("Add at least one event with a date and name.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/calendar-marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marks }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Could not save marks");
        return;
      }
      if (showExisting) {
        await loadExistingMarks();
      }
      onSaved();
      handleOpenChange(false);
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <EditCalendarMarkDialog
        open={editingMark !== null}
        mark={editingMark}
        onOpenChange={(o) => {
          if (!o) setEditingMark(null);
        }}
        onSaved={handleMarkEdited}
      />
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark recurring events</DialogTitle>
          <DialogDescription>
            Choose a date, repeat schedule, and label for each event. Weekly events repeat on the
            same weekday; monthly events repeat on the same day of the month.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="relative space-y-3 rounded-lg border bg-muted/30 p-3 pt-4 dark:bg-muted/15"
              >
                <span className="absolute right-2 top-2 text-xs text-muted-foreground">
                  #{index + 1}
                </span>
                <div className="space-y-2">
                  <Label>Repeat</Label>
                  <Select
                    value={row.recurrence}
                    onValueChange={(v) =>
                      updateRow(row.id, { recurrence: v as CalendarMarkRecurrence })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRENCE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {recurrenceLabel(opt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`mark-date-${row.id}`}>
                    {row.recurrence === "one-time" ? "Date" : "Starting date"}
                  </Label>
                  <Input
                    id={`mark-date-${row.id}`}
                    type="date"
                    value={row.date}
                    onChange={(e) => updateRow(row.id, { date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`mark-title-${row.id}`}>Event name</Label>
                  <Input
                    id={`mark-title-${row.id}`}
                    value={row.title}
                    onChange={(e) => updateRow(row.id, { title: e.target.value })}
                    placeholder="Required"
                    required={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`mark-details-${row.id}`}>Event details (optional)</Label>
                  <textarea
                    id={`mark-details-${row.id}`}
                    value={row.details}
                    onChange={(e) => updateRow(row.id, { details: e.target.value })}
                    placeholder="Notes…"
                    rows={2}
                    className={cn(
                      "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Highlight color</Label>
                  <Select
                    value={row.colorKey}
                    onValueChange={(v) => updateRow(row.id, { colorKey: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MARK_COLOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "h-3 w-3 shrink-0 rounded-full border",
                                getMarkChipClass(opt.key)
                              )}
                              aria-hidden
                            />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {rows.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeRow(row.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Remove this event
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" className="w-full gap-2" onClick={addRow}>
            <Plus className="h-4 w-4" />
            Add another event
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={() => void toggleExistingMarks()}>
            {showExisting ? "Hide all recurring events" : "See all recurring events"}
          </Button>

          {showExisting ? (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">All recurring events</p>
              {loadingExisting ? (
                <p className="text-sm text-muted-foreground">Loading events...</p>
              ) : existingError ? (
                <p className="text-sm text-destructive">{existingError}</p>
              ) : existingMarks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recurring events yet.</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {existingMarks.map((m) => {
                    const markId = resolveMarkId(m.sourceId ?? m._id);
                    const isDeleting = deletingId === markId;
                    return (
                      <li
                        key={m._id}
                        className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-medium">{m.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.date.slice(0, 10)} · {recurrenceLabel(m.recurrence)}
                          </p>
                          <span
                            className={cn(
                              "inline-flex rounded px-1.5 py-0.5 text-xs font-medium",
                              getMarkChipClass(m.colorKey)
                            )}
                          >
                            Highlight
                          </span>
                          {m.details && m.details.trim().length > 0 ? (
                            <p className="text-xs text-muted-foreground">{m.details}</p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 px-2"
                            disabled={isDeleting}
                            onClick={() => setEditingMark(m)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 px-2 text-destructive hover:text-destructive"
                            disabled={isDeleting}
                            onClick={() => void deleteExistingMark(m)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {isDeleting ? "Deleting…" : "Delete"}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Submit marks"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

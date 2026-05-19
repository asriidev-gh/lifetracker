"use client";

import { useState, useEffect } from "react";
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
import { X } from "lucide-react";

const RECURRENCE_OPTIONS: CalendarMarkRecurrence[] = ["one-time", "weekly", "monthly"];

type EditCalendarMarkDialogProps = {
  open: boolean;
  mark: CalendarMarkRecord | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function EditCalendarMarkDialog({
  open,
  mark,
  onOpenChange,
  onSaved,
}: EditCalendarMarkDialogProps) {
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [colorKey, setColorKey] = useState("sky");
  const [recurrence, setRecurrence] = useState<CalendarMarkRecurrence>("one-time");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mark && open) {
      const anchor = mark.anchorDate ?? mark.date;
      setDate(anchor.slice(0, 10));
      setTitle(mark.title);
      setDetails(mark.details ?? "");
      setColorKey(mark.colorKey);
      setRecurrence(mark.recurrence ?? "one-time");
      setError("");
    }
  }, [mark, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mark) return;
    const t = title.trim();
    if (!t) {
      setError("Event name is required.");
      return;
    }
    const d = date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setError("Pick a valid date.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const markId = resolveMarkId(mark.sourceId ?? mark._id);
      const res = await fetch(`/api/calendar-marks/${markId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: d,
          title: t,
          details: details.trim() || undefined,
          colorKey,
          recurrence,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Could not save changes");
        return;
      }
      onSaved();
      onOpenChange(false);
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit marked event</DialogTitle>
          <DialogDescription>
            Update the schedule, starting date, name, notes, or highlight color. Changes apply to
            the whole series for repeating events.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Repeat</Label>
            <Select
              value={recurrence}
              onValueChange={(v) => setRecurrence(v as CalendarMarkRecurrence)}
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
            <Label htmlFor="edit-mark-date">
              {recurrence === "one-time" ? "Date" : "Starting date"}
            </Label>
            <Input
              id="edit-mark-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-mark-title">Event name</Label>
            <Input
              id="edit-mark-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Required"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-mark-details">Event details (optional)</Label>
            <textarea
              id="edit-mark-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Notes…"
              rows={2}
              className={cn(
                "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Highlight color</Label>
            <Select value={colorKey} onValueChange={setColorKey}>
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

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !mark}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

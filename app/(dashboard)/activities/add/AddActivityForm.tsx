"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { eachDayOfInterval, format, parseISO } from "date-fns";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORIES, EnergyLevel, ActivityRecord } from "@/types/activity";
import { useActivityStore } from "@/store/activityStore";

const defaultDate = new Date().toISOString().slice(0, 10);

const dateParamPattern = /^\d{4}-\d{2}-\d{2}$/;

function expandInclusiveDateRange(dateFrom: string, dateTo: string): string[] {
  const start = parseISO(`${dateFrom}T12:00:00`);
  const end = parseISO(`${dateTo}T12:00:00`);
  return eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
}

export function AddActivityForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addActivity = useActivityStore((s) => s.addActivity);
  const addActivities = useActivityStore((s) => s.addActivities);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [tags, setTags] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [dateFrom, setDateFrom] = useState(defaultDate);
  const [dateTo, setDateTo] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>("medium");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const dateFromUrl = searchParams.get("date");
  const sourceFromUrl = searchParams.get("from");
  const isCalendarFlow = sourceFromUrl === "calendar";
  const cancelPath = isCalendarFlow ? "/calendar" : "/activities";

  useEffect(() => {
    if (isCalendarFlow && dateFromUrl && dateParamPattern.test(dateFromUrl)) {
      setDate(dateFromUrl);
    }
  }, [dateFromUrl, isCalendarFlow]);

  useEffect(() => {
    if (category !== "Finance") setAmount("");
  }, [category]);

  function computeDuration() {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm);
    return Math.round((mins / 60) * 100) / 100;
  }

  const rangeDayCount = useMemo(() => {
    if (isCalendarFlow) return 0;
    if (!dateFrom || !dateTo || dateFrom > dateTo) return 0;
    return expandInclusiveDateRange(dateFrom, dateTo).length;
  }, [dateFrom, dateTo, isCalendarFlow]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    try {
      if (isCalendarFlow) {
        const res = await fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: cleanTitle,
            category,
            tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
            date,
            startTime,
            endTime,
            energyLevel,
            notes: notes || undefined,
            ...(category === "Finance" && amount.trim() !== ""
              ? { amount: amount.trim() }
              : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to create activity");
          return;
        }
        addActivity(data as ActivityRecord);
        router.push("/activities");
        return;
      }

      if (!dateFrom || !dateTo) {
        setError("Date from and date to are required");
        return;
      }
      if (!dateParamPattern.test(dateFrom) || !dateParamPattern.test(dateTo)) {
        setError("Use valid dates");
        return;
      }
      if (dateFrom > dateTo) {
        setError("Date from must be on or before date to");
        return;
      }

      const dates = expandInclusiveDateRange(dateFrom, dateTo);
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          category,
          tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          dates,
          startTime,
          endTime,
          energyLevel,
          notes: notes || undefined,
          ...(category === "Finance" && amount.trim() !== ""
            ? { amount: amount.trim() }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create activities");
        return;
      }
      if (!Array.isArray(data.activities)) {
        setError("Unexpected response");
        return;
      }
      addActivities(data.activities as ActivityRecord[]);
      router.push("/activities");
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const duration = computeDuration();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isCalendarFlow ? "New activity" : "New activities (date range)"}</CardTitle>
        {!isCalendarFlow ? (
          <p className="text-sm text-muted-foreground">
            One activity will be created for each day from date from through date to, with the same
            details and times.
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pickleball with friends"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {category === "Finance" ? (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (optional)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 42.50"
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="exercise, friends"
            />
          </div>
          {isCalendarFlow ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Energy level</Label>
                <Select
                  value={energyLevel}
                  onValueChange={(v) => setEnergyLevel(v as EnergyLevel)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">Date from</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    max={dateTo}
                    onChange={(e) => setDateFrom(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo">Date to</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={(e) => setDateTo(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Energy level</Label>
                <Select
                  value={energyLevel}
                  onValueChange={(v) => setEnergyLevel(v as EnergyLevel)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">Start time</Label>
              <Input
                id="start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End time</Label>
              <Input
                id="end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Duration: <strong>{duration}h</strong> (auto-calculated per day)
            {!isCalendarFlow && rangeDayCount > 0 ? (
              <>
                {" "}
                · <strong>{rangeDayCount}</strong> {rangeDayCount === 1 ? "day" : "days"} selected
              </>
            ) : null}
          </p>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : isCalendarFlow
                  ? "Add activity"
                  : rangeDayCount > 0
                    ? `Add ${rangeDayCount} activities`
                    : "Add activities"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(cancelPath)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

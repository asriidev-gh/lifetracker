"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isValid,
  parseISO,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import { CATEGORIES } from "@/types/activity";
import { useActivityStore } from "@/store/activityStore";

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

function parseMonthStart(dateFrom: string, dateTo: string): Date {
  const raw = dateFrom || dateTo;
  if (raw && dateKeyPattern.test(raw)) {
    const d = parseISO(`${raw}T12:00:00`);
    if (isValid(d)) return startOfMonth(d);
  }
  return startOfMonth(new Date());
}

export function ActivitiesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [urlSynced, setUrlSynced] = useState(false);
  const setActivities = useActivityStore((s) => s.setActivities);

  const queryKey = searchParams.toString();

  useEffect(() => {
    setActivities([]);
    const sp = new URLSearchParams(queryKey);
    setDateFrom(sp.get("dateFrom") ?? "");
    setDateTo(sp.get("dateTo") ?? "");
    const rawCat = sp.get("category") ?? "all";
    setCategory(
      rawCat === "all" || (CATEGORIES as readonly string[]).includes(rawCat) ? rawCat : "all"
    );
    setSearch(sp.get("search") ?? "");
    setUrlSynced(true);
  }, [queryKey, setActivities]);

  useEffect(() => {
    if (!urlSynced) return;
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (category && category !== "all") params.set("category", category);
    if (search.trim()) params.set("search", search.trim());
    fetch(`/api/activities?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setActivities(data);
      })
      .catch(() => setActivities([]));
  }, [dateFrom, dateTo, category, search, setActivities, urlSynced]);

  const selectedMonthStart = useMemo(
    () => parseMonthStart(dateFrom, dateTo),
    [dateFrom, dateTo]
  );
  const canGoNextMonth =
    selectedMonthStart.getTime() < startOfMonth(new Date()).getTime();

  const navigateMonth = useCallback(
    (delta: -1 | 1) => {
      const anchor = parseMonthStart(dateFrom, dateTo);
      const targetMonth = addMonths(anchor, delta);
      const targetStart = startOfMonth(targetMonth);
      const todayMonthStart = startOfMonth(new Date());
      if (delta === 1 && isAfter(targetStart, todayMonthStart)) return;
      const from = format(targetStart, "yyyy-MM-dd");
      const to = format(endOfMonth(targetStart), "yyyy-MM-dd");
      const params = new URLSearchParams(searchParams.toString());
      params.set("dateFrom", from);
      params.set("dateTo", to);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [dateFrom, dateTo, searchParams, pathname, router]
  );

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
      <div className="space-y-2">
        <Label>From date</Label>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>To date</Label>
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="sr-only sm:not-sr-only sm:min-h-[1.25rem]">Month</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => navigateMonth(-1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous month
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={!canGoNextMonth}
            onClick={() => navigateMonth(1)}
          >
            Next month
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 space-y-2 min-w-[200px]">
        <Label>Search</Label>
        <Input
          placeholder="Search activities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>
  );
}

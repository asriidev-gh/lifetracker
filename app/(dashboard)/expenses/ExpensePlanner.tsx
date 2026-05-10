"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ActivityRecord } from "@/types/activity";

type ExpenseItem = {
  _id: string;
  name: string;
  amount: number;
  type: "recurring" | "one-time";
  dueDay: number | null;
  dueDate: string;
  active: boolean;
};

function monthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatPeso(value: number) {
  return pesoFormatter.format(value);
}

function formatMonthHeading(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleString("en-PH", { month: "long", year: "numeric" });
}

export function ExpensePlanner() {
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"recurring" | "one-time">("recurring");
  const [dueDay, setDueDay] = useState("1");
  const [dueDate, setDueDate] = useState("");
  const [active, setActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [financeActivities, setFinanceActivities] = useState<ActivityRecord[]>([]);
  const [financeLoading, setFinanceLoading] = useState(true);

  async function loadItems() {
    const res = await fetch("/api/expenses");
    const data = await res.json();
    if (Array.isArray(data)) setItems(data);
    else setItems([]);
  }

  useEffect(() => {
    loadItems()
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const [y, m] = selectedMonth.split("-");
    if (!y || !m) return;
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    const dateFrom = `${y}-${m}-01`;
    const dateTo = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
    setFinanceLoading(true);
    const q = new URLSearchParams({
      dateFrom,
      dateTo,
      category: "Finance",
    });
    fetch(`/api/activities?${q}`)
      .then((res) => res.json())
      .then((data: unknown) => {
        setFinanceActivities(Array.isArray(data) ? (data as ActivityRecord[]) : []);
      })
      .catch(() => setFinanceActivities([]))
      .finally(() => setFinanceLoading(false));
  }, [selectedMonth]);

  function resetForm() {
    setName("");
    setAmount("");
    setType("recurring");
    setDueDay("1");
    setDueDate("");
    setActive(true);
    setEditingId(null);
    setError("");
  }

  function dismissForm() {
    resetForm();
    setFormOpen(false);
  }

  async function submitItem() {
    const cleanName = name.trim();
    const amountNum = Number(amount);
    if (!cleanName) {
      setError("Item name is required");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      setError("Amount must be a valid non-negative number");
      return;
    }
    if (type === "recurring") {
      const day = Number(dueDay);
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        setError("Recurring due day must be 1-31");
        return;
      }
    } else if (!dueDate) {
      setError("One-time due date is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(editingId ? `/api/expenses/${editingId}` : "/api/expenses", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          amount: amountNum,
          type,
          dueDay: type === "recurring" ? Number(dueDay) : undefined,
          dueDate: type === "one-time" ? dueDate : undefined,
          active,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to save expense item");
        return;
      }
      await loadItems();
      dismissForm();
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this expense item?")) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) await loadItems();
  }

  function startEdit(item: ExpenseItem) {
    setFormOpen(true);
    setEditingId(item._id);
    setName(item.name);
    setAmount(String(item.amount));
    setType(item.type);
    setDueDay(String(item.dueDay ?? 1));
    setDueDate(item.dueDate ?? "");
    setActive(item.active);
    setError("");
  }

  const { monthlyItems, monthlyTotal, recurringTotal, oneTimeTotal } = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split("-");
    const monthly = items.filter((item) => {
      if (!item.active) return false;
      if (item.type === "recurring") return true;
      if (!item.dueDate) return false;
      return item.dueDate.startsWith(`${yearStr}-${monthStr}`);
    });
    const recurring = monthly
      .filter((x) => x.type === "recurring")
      .reduce((sum, x) => sum + x.amount, 0);
    const oneTime = monthly
      .filter((x) => x.type === "one-time")
      .reduce((sum, x) => sum + x.amount, 0);
    return {
      monthlyItems: monthly.sort((a, b) => {
        const aKey = a.type === "recurring" ? (a.dueDay ?? 99) : Number(a.dueDate.slice(8, 10));
        const bKey = b.type === "recurring" ? (b.dueDay ?? 99) : Number(b.dueDate.slice(8, 10));
        return aKey - bKey;
      }),
      monthlyTotal: recurring + oneTime,
      recurringTotal: recurring,
      oneTimeTotal: oneTime,
    };
  }, [items, selectedMonth]);

  const financeActivityTotal = useMemo(() => {
    return financeActivities.reduce((sum, a) => {
      const n = a.amount;
      if (n == null || !Number.isFinite(Number(n))) return sum;
      return sum + Number(n);
    }, 0);
  }, [financeActivities]);

  const activitiesFilteredHref = useMemo(() => {
    const [y, m] = selectedMonth.split("-");
    if (!y || !m) return "/activities";
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    const dateFrom = `${y}-${m}-01`;
    const dateTo = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
    const q = new URLSearchParams({
      category: "Finance",
      dateFrom,
      dateTo,
    });
    return `/activities?${q.toString()}`;
  }, [selectedMonth]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly Expense Plan</h1>
          <p className="mt-0.5 text-muted-foreground">
            Track recurring and one-time bills with monthly total auto calculation.
          </p>
        </div>
        <div className="flex shrink-0 justify-end sm:pt-1">
          {formOpen ? (
            <Button type="button" variant="outline" onClick={dismissForm}>
              Close
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                resetForm();
                setFormOpen(true);
              }}
            >
              Add Expense Item
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
      {formOpen ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Expense Item" : "Add Expense Item"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount (PHP)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={type === "recurring" ? "default" : "outline"} onClick={() => setType("recurring")}>Recurring</Button>
              <Button type="button" variant={type === "one-time" ? "default" : "outline"} onClick={() => setType("one-time")}>One-time</Button>
            </div>
            {type === "recurring" ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Day of month due (1-31)</p>
                <Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Due date</p>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Active
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={dismissForm}>
                Cancel
              </Button>
              <Button type="button" onClick={submitItem} disabled={saving}>{saving ? "Saving..." : editingId ? "Update" : "Add"}</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Label htmlFor="expense-month">Month (both tabs)</Label>
          <p className="text-xs text-muted-foreground">
            Applies to logged Finance totals and your budget plan for {formatMonthHeading(selectedMonth)}.
          </p>
        </div>
        <Input
          id="expense-month"
          type="month"
          className="w-full sm:w-[200px]"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
      </div>

      <Tabs defaultValue="current-expense" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:inline-flex sm:h-10 sm:w-auto">
          <TabsTrigger value="current-expense" className="px-2 py-2 text-center sm:px-3 sm:py-1.5">
            Current Monthly Expense
          </TabsTrigger>
          <TabsTrigger value="monthly-plan" className="px-2 py-2 text-center sm:px-3 sm:py-1.5">
            Monthly Plan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current-expense" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Monthly Expense</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Finance activities logged for the selected month (from your calendar / activities).
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Total from logged Finance activities</p>
                <p className="text-xl font-semibold tabular-nums">{formatPeso(financeActivityTotal)}</p>
              </div>
              {financeLoading ? (
                <p className="text-sm text-muted-foreground">Loading activities…</p>
              ) : financeActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No Finance activities for this month. Add amounts under category Finance on{" "}
                  <Link href="/activities/add" className="font-medium text-primary underline-offset-4 hover:underline">
                    Add activity
                  </Link>
                  .
                </p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {financeActivities.map((a) => {
                    const hasAmt = a.amount != null && Number.isFinite(Number(a.amount));
                    return (
                      <li key={a._id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">{a.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {a.date} · {a.startTime}–{a.endTime}
                            {a.notes?.trim() ? ` · ${a.notes.trim()}` : null}
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold tabular-nums text-foreground">
                          {hasAmt ? formatPeso(Number(a.amount)) : "—"}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                <Link
                  href={activitiesFilteredHref}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open Activities
                </Link>{" "}
                to edit or add entries (Finance · same month).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly-plan" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Plan</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Budget line items for {formatMonthHeading(selectedMonth)} — change month with the control above.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Recurring total</p>
                  <p className="text-xl font-semibold tabular-nums">{formatPeso(recurringTotal)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">One-time total</p>
                  <p className="text-xl font-semibold tabular-nums">{formatPeso(oneTimeTotal)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Monthly total expense</p>
                  <p className="text-xl font-semibold tabular-nums">{formatPeso(monthlyTotal)}</p>
                </div>
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : monthlyItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active expense items for this month.</p>
              ) : (
                <div className="space-y-2">
                  {monthlyItems.map((item) => (
                    <div key={item._id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.type === "recurring" ? `Recurring - due day ${item.dueDay ?? "-"}` : `One-time - due ${item.dueDate}`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold tabular-nums">{formatPeso(item.amount)}</p>
                        <Button type="button" size="sm" variant="outline" onClick={() => startEdit(item)}>Edit</Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => void deleteItem(item._id)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

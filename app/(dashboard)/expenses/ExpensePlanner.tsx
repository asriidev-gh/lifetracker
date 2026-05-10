"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
      resetForm();
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Expense Item" : "Add Expense Item"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="number" min="0" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
            {editingId ? <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button> : null}
            <Button type="button" onClick={submitItem} disabled={saving}>{saving ? "Saving..." : editingId ? "Update" : "Add"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Monthly Plan</CardTitle>
          <Input type="month" className="w-[180px]" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Recurring total</p><p className="text-xl font-semibold">${recurringTotal.toFixed(2)}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">One-time total</p><p className="text-xl font-semibold">${oneTimeTotal.toFixed(2)}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Monthly total expense</p><p className="text-xl font-semibold">${monthlyTotal.toFixed(2)}</p></div>
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
                    <p className="font-semibold">${item.amount.toFixed(2)}</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => startEdit(item)}>Edit</Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => void deleteItem(item._id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TodoItem = {
  _id: string;
  title: string;
  notes: string;
  dueDate: string;
  completed: boolean;
};

export function TodoManager() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadTodos() {
    const res = await fetch("/api/todos");
    const data = await res.json();
    if (Array.isArray(data)) {
      setTodos(data);
      return;
    }
    setTodos([]);
  }

  useEffect(() => {
    loadTodos()
      .catch(() => setTodos([]))
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setTitle("");
    setNotes("");
    setDueDate("");
    setEditingId(null);
    setError("");
  }

  async function submitTodo() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(editingId ? `/api/todos/${editingId}` : "/api/todos", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          notes: notes.trim(),
          dueDate,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to save to do");
        return;
      }
      await loadTodos();
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete(item: TodoItem) {
    const res = await fetch(`/api/todos/${item._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !item.completed }),
    });
    if (res.ok) {
      await loadTodos();
    }
  }

  async function deleteTodo(id: string) {
    if (!confirm("Delete this to do?")) return;
    const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadTodos();
    }
  }

  function startEdit(item: TodoItem) {
    setEditingId(item._id);
    setTitle(item.title);
    setNotes(item.notes ?? "");
    setDueDate(item.dueDate ?? "");
    setError("");
  }

  const sortedTodos = useMemo(
    () =>
      [...todos].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }),
    [todos]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit To Do" : "Add To Do"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="Optional notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Due date (optional)</p>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            ) : null}
            <Button type="button" onClick={submitTodo} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Add"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>To Do List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : sortedTodos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No to do yet.</p>
          ) : (
            <div className="space-y-2">
              {sortedTodos.map((item) => (
                <div
                  key={item._id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => void toggleComplete(item)}
                        className="mt-1"
                      />
                      <div>
                        <p className={item.completed ? "line-through text-muted-foreground" : ""}>
                          {item.title}
                        </p>
                        {item.notes ? (
                          <p className="text-sm text-muted-foreground">{item.notes}</p>
                        ) : null}
                        {item.dueDate ? (
                          <p className="text-xs text-muted-foreground">Due: {item.dueDate}</p>
                        ) : null}
                      </div>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => startEdit(item)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => void deleteTodo(item._id)}
                    >
                      Delete
                    </Button>
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

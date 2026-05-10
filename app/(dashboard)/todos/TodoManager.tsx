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
  const [formExpanded, setFormExpanded] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [error, setError] = useState("");

  const showForm = formExpanded || editingId !== null;

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
    setFormExpanded(false);
    setError("");
  }

  function openCreateForm() {
    setEditingId(null);
    setTitle("");
    setNotes("");
    setDueDate("");
    setError("");
    setFormExpanded(true);
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
    setFormExpanded(false);
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

  const completedCount = useMemo(() => todos.filter((t) => t.completed).length, [todos]);

  const displayTodos = useMemo(() => {
    if (showCompleted) return sortedTodos;
    return sortedTodos.filter((t) => !t.completed);
  }, [sortedTodos, showCompleted]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">To Do</h1>
          <p className="text-muted-foreground">
            Add, edit, complete, and track your tasks.
          </p>
        </div>
        {!showForm ? (
          <Button
            type="button"
            onClick={openCreateForm}
            className="shrink-0 self-end sm:self-start"
          >
            Create to do
          </Button>
        ) : null}
      </div>

      <div className="space-y-4">
      {showForm ? (
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
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="button" onClick={submitTodo} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>To Do List</CardTitle>
          {completedCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 self-start sm:self-auto"
              onClick={() => setShowCompleted((v) => !v)}
            >
              {showCompleted
                ? "Hide completed"
                : `Show completed (${completedCount})`}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : todos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No to do yet.</p>
          ) : displayTodos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {completedCount > 0 && !showCompleted
                ? "No active tasks. You are all caught up — use Show completed to review finished items."
                : "No tasks in this view."}
            </p>
          ) : (
            <div className="space-y-2">
              {displayTodos.map((item) => (
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
    </div>
  );
}

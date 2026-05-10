"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PasswordEntryRecord } from "@/types/passwordEntry";
import { cn } from "@/lib/utils";
import {
  getPasswordCategoryLabel,
  PASSWORD_CATEGORY_OPTIONS,
  type PasswordEntryCategoryKey,
} from "@/lib/passwordEntryCategories";
import { Clock, Copy, Eye, EyeOff } from "lucide-react";

const REVEAL_DURATION_MS = 30_000;

type IdentityVerifyPending =
  | { kind: "reveal"; id: string }
  | { kind: "edit"; item: PasswordEntryRecord }
  | { kind: "delete"; id: string }
  | null;

type ListCategoryFilter = "all" | PasswordEntryCategoryKey;

/** When locked, shows only the first 3 characters (e.g. `testonly` → `tes***`). */
function maskSavedUsername(username: string, revealed: boolean): string {
  if (revealed) return username;
  const n = username.length;
  if (n <= 3) return "***";
  return `${username.slice(0, 3)}***`;
}

export function PasswordManager() {
  const [entries, setEntries] = useState<PasswordEntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [label, setLabel] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<PasswordEntryCategoryKey>("email");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showFormPassword, setShowFormPassword] = useState(false);

  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [verifyPending, setVerifyPending] = useState<IdentityVerifyPending>(null);
  const [revealAccountPassword, setRevealAccountPassword] = useState("");
  const [revealShowInput, setRevealShowInput] = useState(false);
  const [revealError, setRevealError] = useState("");
  const [revealVerifying, setRevealVerifying] = useState(false);
  const [copiedUsernameId, setCopiedUsernameId] = useState<string | null>(null);
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null);
  /** Auto-hide after Show: epoch ms when reveal expires (not used for Edit-only unlock). */
  const [revealDeadlineById, setRevealDeadlineById] = useState<Record<string, number>>({});
  const [revealTick, setRevealTick] = useState(0);
  const [listSearch, setListSearch] = useState("");
  const [listCategoryFilter, setListCategoryFilter] = useState<ListCategoryFilter>("all");

  async function loadEntries() {
    const res = await fetch("/api/passwords");
    const data = await res.json().catch(() => null);
    if (Array.isArray(data)) {
      setEntries(data as PasswordEntryRecord[]);
      return;
    }
    setEntries([]);
  }

  useEffect(() => {
    loadEntries()
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (Object.keys(revealDeadlineById).length === 0) return;
    const id = window.setInterval(() => setRevealTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [revealDeadlineById]);

  useEffect(() => {
    if (Object.keys(revealDeadlineById).length === 0) return;
    const now = Date.now();
    const expired = Object.entries(revealDeadlineById)
      .filter(([, until]) => until <= now)
      .map(([entryId]) => entryId);
    if (expired.length === 0) return;
    setShowPasswords((prev) => {
      const next = { ...prev };
      for (const entryId of expired) next[entryId] = false;
      return next;
    });
    setRevealDeadlineById((prev) => {
      const next = { ...prev };
      for (const entryId of expired) delete next[entryId];
      return next;
    });
    setCopiedUsernameId((cur) => (cur && expired.includes(cur) ? null : cur));
    setCopiedPasswordId((cur) => (cur && expired.includes(cur) ? null : cur));
  }, [revealTick, revealDeadlineById]);

  function resetForm() {
    setLabel("");
    setUsername("");
    setPassword("");
    setNotes("");
    setCategory("email");
    setEditingId(null);
    setShowFormPassword(false);
    setError("");
  }

  function startEdit(item: PasswordEntryRecord) {
    setEditingId(item._id);
    setLabel(item.label);
    setUsername(item.username);
    setPassword(item.password);
    setNotes(item.notes ?? "");
    setCategory(item.category);
    setError("");
  }

  async function submitEntry() {
    const cleanLabel = label.trim();
    const cleanUsername = username.trim();
    if (!cleanLabel) {
      setError("Label is required");
      return;
    }
    if (!cleanUsername) {
      setError("Username is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(editingId ? `/api/passwords/${editingId}` : "/api/passwords", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: cleanLabel,
          username: cleanUsername,
          category,
          password,
          notes: notes.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to save password entry");
        return;
      }
      await loadEntries();
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function performDeleteEntry(id: string) {
    const res = await fetch(`/api/passwords/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(typeof data?.error === "string" ? data.error : "Failed to delete entry");
    }
    await loadEntries();
    setShowPasswords((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRevealDeadlineById((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setCopiedUsernameId((current) => (current === id ? null : current));
    setCopiedPasswordId((current) => (current === id ? null : current));
    if (editingId === id) resetForm();
  }

  function openDeleteVerifyModal(id: string) {
    setVerifyPending({ kind: "delete", id });
    setRevealAccountPassword("");
    setRevealShowInput(false);
    setRevealError("");
    setRevealModalOpen(true);
  }

  function openRevealModal(entryId: string) {
    setVerifyPending({ kind: "reveal", id: entryId });
    setRevealAccountPassword("");
    setRevealShowInput(false);
    setRevealError("");
    setRevealModalOpen(true);
  }

  function openEditVerifyModal(item: PasswordEntryRecord) {
    setVerifyPending({ kind: "edit", item });
    setRevealAccountPassword("");
    setRevealShowInput(false);
    setRevealError("");
    setRevealModalOpen(true);
  }

  function closeRevealModal() {
    setRevealModalOpen(false);
    setVerifyPending(null);
    setRevealAccountPassword("");
    setRevealShowInput(false);
    setRevealError("");
    setRevealVerifying(false);
  }

  async function confirmRevealPassword() {
    if (!verifyPending) return;
    const pending = verifyPending;
    setRevealVerifying(true);
    setRevealError("");
    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: revealAccountPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRevealError(typeof data?.error === "string" ? data.error : "Could not verify");
        return;
      }
      if (pending.kind === "reveal") {
        const until = Date.now() + REVEAL_DURATION_MS;
        setShowPasswords((prev) => ({ ...prev, [pending.id]: true }));
        setRevealDeadlineById((prev) => ({ ...prev, [pending.id]: until }));
      } else if (pending.kind === "edit") {
        startEdit(pending.item);
        setShowPasswords((prev) => ({ ...prev, [pending.item._id]: false }));
        setRevealDeadlineById((prev) => {
          const next = { ...prev };
          delete next[pending.item._id];
          return next;
        });
        setCopiedUsernameId((id) => (id === pending.item._id ? null : id));
        setCopiedPasswordId((id) => (id === pending.item._id ? null : id));
      } else {
        try {
          await performDeleteEntry(pending.id);
        } catch (err) {
          setRevealError(err instanceof Error ? err.message : "Failed to delete entry");
          return;
        }
      }
      closeRevealModal();
    } finally {
      setRevealVerifying(false);
    }
  }

  function handleSavedShowToggle(item: PasswordEntryRecord) {
    if (showPasswords[item._id]) {
      setShowPasswords((prev) => ({ ...prev, [item._id]: false }));
      setRevealDeadlineById((prev) => {
        if (!(item._id in prev)) return prev;
        const next = { ...prev };
        delete next[item._id];
        return next;
      });
      setCopiedUsernameId((id) => (id === item._id ? null : id));
      setCopiedPasswordId((id) => (id === item._id ? null : id));
      return;
    }
    openRevealModal(item._id);
  }

  async function copySavedUsername(entryId: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUsernameId(entryId);
      window.setTimeout(() => {
        setCopiedUsernameId((current) => (current === entryId ? null : current));
      }, 2000);
    } catch {
      // Clipboard may be denied (non-HTTPS, permissions); no-op
    }
  }

  async function copySavedPassword(entryId: string, secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedPasswordId(entryId);
      window.setTimeout(() => {
        setCopiedPasswordId((current) => (current === entryId ? null : current));
      }, 2000);
    } catch {
      // Clipboard may be denied (non-HTTPS, permissions); no-op
    }
  }

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        const c = a.category.localeCompare(b.category);
        if (c !== 0) return c;
        return a.label.localeCompare(b.label);
      }),
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return sortedEntries.filter((item) => {
      if (listCategoryFilter !== "all" && item.category !== listCategoryFilter) return false;
      if (!q) return true;
      if (item.label.toLowerCase().includes(q)) return true;
      if (item.username.toLowerCase().includes(q)) return true;
      if ((item.notes ?? "").toLowerCase().includes(q)) return true;
      if (getPasswordCategoryLabel(item.category).toLowerCase().includes(q)) return true;
      return false;
    });
  }, [sortedEntries, listSearch, listCategoryFilter]);

  return (
    <div className="space-y-6">
      <Dialog
        open={revealModalOpen}
        onOpenChange={(open) => {
          if (!open) closeRevealModal();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm your identity</DialogTitle>
            <DialogDescription>
              {verifyPending?.kind === "delete"
                ? "Enter your LifeTrack account password to permanently delete this saved entry."
                : verifyPending?.kind === "edit"
                  ? "Enter your LifeTrack account password to edit this saved entry."
                  : "Enter your LifeTrack account password to view this saved password. It hides automatically after 30 seconds."}
            </DialogDescription>
          </DialogHeader>
          <form
            id="pm-verify-identity"
            className="space-y-2"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              void confirmRevealPassword();
            }}
          >
            <Label htmlFor="pm-verify-identity-password">Account password</Label>
            <div className="relative">
              <Input
                id="pm-verify-identity-password"
                name="pm-verify-identity-password"
                type={revealShowInput ? "text" : "password"}
                value={revealAccountPassword}
                onChange={(e) => setRevealAccountPassword(e.target.value)}
                className="pr-10"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={() => setRevealShowInput((v) => !v)}
                aria-label={revealShowInput ? "Hide account password" : "Show account password"}
              >
                {revealShowInput ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {revealError ? <p className="text-sm text-destructive">{revealError}</p> : null}
          </form>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeRevealModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="pm-verify-identity"
              variant={verifyPending?.kind === "delete" ? "destructive" : "default"}
              disabled={revealVerifying}
            >
              {revealVerifying
                ? "Verifying…"
                : verifyPending?.kind === "delete"
                  ? "Delete"
                  : "Unlock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Password Manager</h1>
        <p className="text-muted-foreground">
          Save and manage your passwords. Stored values are encrypted with your secret word from
          environment config.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Password Entry" : "Add Password Entry"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              void submitEntry();
            }}
          >
            {/* Decoy fields: some browsers autofill the first password-like inputs on the page */}
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <input type="text" name="pm-decoy-user" autoComplete="username" tabIndex={-1} />
              <input type="password" name="pm-decoy-pass" autoComplete="current-password" tabIndex={-1} />
            </div>
            <Input
              id="pm-entry-label"
              name="pm-entry-label"
              placeholder="Label (e.g., Gmail)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
            <div className="space-y-2">
              <Label htmlFor="pm-entry-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as PasswordEntryCategoryKey)}>
                <SelectTrigger id="pm-entry-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PASSWORD_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              id="pm-service-username"
              name="pm-service-username"
              placeholder="Username / Email / Mobile number"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
            <div className="relative">
              <Input
                id="pm-entry-secret"
                name="pm-entry-secret"
                type={showFormPassword ? "text" : "password"}
                placeholder="Password for this service (not your LifeTrack login)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                autoComplete="new-password"
                data-1p-ignore
                data-lpignore="true"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={() => setShowFormPassword((v) => !v)}
                aria-label={showFormPassword ? "Hide password" : "Show password"}
              >
                {showFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Input
              id="pm-entry-notes"
              name="pm-entry-notes"
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <CardTitle className="shrink-0">Saved Passwords</CardTitle>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-end lg:max-w-xl">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="pm-list-search" className="text-xs text-muted-foreground">
                  Search
                </Label>
                <Input
                  id="pm-list-search"
                  placeholder="Label, username, notes, category…"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="w-full space-y-1.5 sm:w-44">
                <Label htmlFor="pm-list-category-filter" className="text-xs text-muted-foreground">
                  Category
                </Label>
                <Select
                  value={listCategoryFilter}
                  onValueChange={(v) => setListCategoryFilter(v as ListCategoryFilter)}
                >
                  <SelectTrigger id="pm-list-category-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {PASSWORD_CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : sortedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No password entries yet.</p>
          ) : filteredEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No entries match your search or category filter.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((item) => {
                const reveal = !!showPasswords[item._id];
                return (
                  <div key={item._id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{item.label}</p>
                          <span
                            className={cn(
                              "rounded-md border bg-muted/50 px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                            )}
                          >
                            {getPasswordCategoryLabel(item.category)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                          <span>
                            Username: {maskSavedUsername(item.username, reveal)}
                          </span>
                          {reveal ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 shrink-0 gap-1 px-2 text-muted-foreground hover:text-foreground"
                              onClick={() => void copySavedUsername(item._id, item.username)}
                              aria-label="Copy username"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {copiedUsernameId === item._id ? "Copied" : "Copy"}
                            </Button>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs break-all">
                          <span className="min-w-0">
                            Password: {reveal ? item.password : "••••••••••••"}
                          </span>
                          {reveal ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 shrink-0 gap-1 px-2 font-sans text-muted-foreground hover:text-foreground"
                              onClick={() => void copySavedPassword(item._id, item.password)}
                              aria-label="Copy password"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {copiedPasswordId === item._id ? "Copied" : "Copy"}
                            </Button>
                          ) : null}
                        </div>
                        {reveal && revealDeadlineById[item._id] != null ? (
                          <p
                            className="flex items-center gap-1.5 text-xs tabular-nums text-amber-700 dark:text-amber-400"
                            aria-live="polite"
                          >
                            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span>
                              Auto-hide in{" "}
                              {Math.max(
                                0,
                                Math.ceil((revealDeadlineById[item._id] - Date.now()) / 1000)
                              )}
                              s
                            </span>
                          </p>
                        ) : null}
                        {item.notes ? (
                          <p className="text-xs text-muted-foreground">{item.notes}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSavedShowToggle(item)}
                        >
                          {reveal ? "Hide" : "Show"}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => openEditVerifyModal(item)}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeleteVerifyModal(item._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

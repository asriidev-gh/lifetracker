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
import { cn } from "@/lib/utils";
import type { NoteRecord, NoteColorKey } from "@/types/note";
import {
  getNoteColorSwatchClass,
  getNotePadBgClass,
  NOTE_COLOR_OPTIONS,
} from "@/lib/noteColors";
import {
  getNoteCategoryLabel,
  NOTE_CATEGORY_OPTIONS,
  type NoteCategoryKey,
} from "@/lib/noteCategories";
import { htmlToPlainText } from "@/lib/noteHtml";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Heading1,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pin,
  PinOff,
  Plus,
  Redo2,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

type CategoryFilter = "all" | NoteCategoryKey;

export function NotesManager() {
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<NoteCategoryKey>("quick");
  const [colorKey, setColorKey] = useState<NoteColorKey>("default");
  const [isPinned, setIsPinned] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const editorExtensions = useMemo(
    () => [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto", "tel"],
      }),
    ],
    []
  );

  const editor = useEditor({
    extensions: editorExtensions,
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[360px] w-full rounded-md border border-input/60 bg-transparent px-3 py-2 text-sm focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => {
      setContent(e.getHTML());
    },
  });

  async function loadNotes() {
    const res = await fetch("/api/notes");
    const data = await res.json().catch(() => null);
    if (Array.isArray(data)) {
      setNotes(data as NoteRecord[]);
      return;
    }
    setNotes([]);
  }

  useEffect(() => {
    loadNotes()
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, []);

  function resetEditor() {
    setSelectedId(null);
    setTitle("");
    setContent("");
    setCategory("quick");
    setColorKey("default");
    setIsPinned(false);
    setError("");
    editor?.commands.setContent("", { emitUpdate: false });
  }

  function startCreate() {
    resetEditor();
  }

  function startEdit(note: NoteRecord) {
    setSelectedId(note._id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setColorKey(note.colorKey ?? "default");
    setIsPinned(note.isPinned);
    setError("");
    editor?.commands.setContent(note.content || "", { emitUpdate: false });
  }

  async function saveNote() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: title.trim(),
        content,
        category,
        colorKey,
        isPinned,
      };
      const res = await fetch(selectedId ? `/api/notes/${selectedId}` : "/api/notes", {
        method: selectedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Failed to save note");
        return;
      }
      await loadNotes();
      if (data?._id) {
        startEdit(data as NoteRecord);
      } else {
        resetEditor();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this note?")) return;
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadNotes();
      if (selectedId === id) resetEditor();
    }
  }

  async function togglePin(id: string, nextPinned: boolean) {
    const res = await fetch(`/api/notes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: nextPinned }),
    });
    if (res.ok) {
      await loadNotes();
      if (selectedId === id) setIsPinned(nextPinned);
    }
  }

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", previous ?? "");
    if (url === null) return;
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (categoryFilter !== "all" && n.category !== categoryFilter) return false;
      if (!q) return true;
      if (n.title.toLowerCase().includes(q)) return true;
      if (htmlToPlainText(n.content).toLowerCase().includes(q)) return true;
      if (getNoteCategoryLabel(n.category).toLowerCase().includes(q)) return true;
      return false;
    });
  }, [notes, search, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notes</h1>
          <p className="text-muted-foreground">Your digital scratch paper for quick ideas and longer notes.</p>
        </div>
        <Button type="button" className="gap-2" onClick={startCreate}>
          <Plus className="h-4 w-4" />
          New note
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <Card className="h-fit">
          <CardHeader className="space-y-3">
            <CardTitle>Notes List</CardTitle>
            <div className="space-y-2">
              <Input
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {NOTE_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : filteredNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes match this filter.</p>
            ) : (
              <div className="space-y-2">
                {filteredNotes.map((note) => (
                  <button
                    key={note._id}
                    type="button"
                    onClick={() => startEdit(note)}
                    className={cn(
                      "w-full rounded-md border p-3 text-left transition-colors",
                      getNotePadBgClass(note.colorKey ?? "default"),
                      selectedId === note._id
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "hover:brightness-[0.98] dark:hover:brightness-110"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{note.title}</p>
                      {note.isPinned ? <Pin className="h-3.5 w-3.5 text-primary" /> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {htmlToPlainText(note.content) || "(empty note)"}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {getNoteCategoryLabel(note.category)} · Updated{" "}
                      {new Date(note.updatedAt).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn("overflow-hidden", getNotePadBgClass(colorKey))}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>{selectedId ? "Edit note" : "Create note"}</CardTitle>
            {selectedId ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => void togglePin(selectedId, !isPinned)}
                >
                  {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  {isPinned ? "Unpin" : "Pin"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="gap-1"
                  onClick={() => void deleteNote(selectedId)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional title (first line of content used if empty)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as NoteCategoryKey)}>
                <SelectTrigger id="note-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notepad color</Label>
              <div className="flex flex-wrap gap-2">
                {NOTE_COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    title={opt.label}
                    aria-label={opt.label}
                    aria-pressed={colorKey === opt.key}
                    onClick={() => setColorKey(opt.key)}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105",
                      getNoteColorSwatchClass(opt.key),
                      colorKey === opt.key
                        ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "border-transparent"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <div className="flex flex-wrap items-center gap-1 rounded-md border border-input/60 bg-background/40 p-1 dark:bg-background/20">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn("h-8 px-2", editor?.isActive("bold") && "bg-muted")}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn("h-8 px-2", editor?.isActive("italic") && "bg-muted")}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn("h-8 px-2", editor?.isActive("underline") && "bg-muted")}
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                >
                  <UnderlineIcon className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn("h-8 px-2", editor?.isActive("heading", { level: 1 }) && "bg-muted")}
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn("h-8 px-2", editor?.isActive("bulletList") && "bg-muted")}
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn("h-8 px-2", editor?.isActive("orderedList") && "bg-muted")}
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn("h-8 px-2", editor?.isActive("link") && "bg-muted")}
                  onClick={setLink}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => editor?.chain().focus().undo().run()}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => editor?.chain().focus().redo().run()}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </div>
              {editor ? (
                <EditorContent editor={editor} />
              ) : (
                <div
                  className="min-h-[360px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
                  aria-hidden
                />
              )}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetEditor}>
                Clear
              </Button>
              <Button type="button" onClick={() => void saveNote()} disabled={saving}>
                {saving ? "Saving..." : selectedId ? "Update note" : "Create note"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

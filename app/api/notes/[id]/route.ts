import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Note } from "@/models/Note";
import { isNoteCategoryKey, type NoteCategoryKey } from "@/lib/noteCategories";

function contentToPlainText(content: string) {
  return content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

function pickNoteTitle(rawTitle: string, content: string) {
  const title = rawTitle.trim();
  if (title) return title;
  const plain = contentToPlainText(content);
  return plain.split(/\r?\n/)[0]?.trim() || "Untitled note";
}

function serializeNote(doc: {
  _id: { toString(): string };
  userId: { toString(): string };
  title: string;
  content: string;
  category?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const category: NoteCategoryKey =
    typeof doc.category === "string" && isNoteCategoryKey(doc.category) ? doc.category : "quick";
  return {
    _id: doc._id.toString(),
    userId: doc.userId.toString(),
    title: doc.title,
    content: doc.content,
    category,
    isPinned: !!doc.isPinned,
    isArchived: !!doc.isArchived,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    await connectDB();
    const note = await Note.findOne({ _id: id, userId });
    if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const hasTitle = body?.title !== undefined;
    const rawTitle = hasTitle && typeof body.title === "string" ? body.title : "";
    if (body?.content !== undefined) {
      note.content = typeof body.content === "string" ? body.content : "";
    }
    if (hasTitle) {
      note.title = pickNoteTitle(rawTitle, note.content);
    } else if (body?.content !== undefined && (!note.title || note.title === "Untitled note")) {
      note.title = pickNoteTitle("", note.content);
    }
    if (body?.category !== undefined) {
      const categoryRaw = typeof body.category === "string" ? body.category : "";
      if (!isNoteCategoryKey(categoryRaw)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      note.category = categoryRaw;
    }
    if (body?.isPinned !== undefined) note.isPinned = !!body.isPinned;
    if (body?.isArchived !== undefined) note.isArchived = !!body.isArchived;

    await note.save();
    return NextResponse.json(serializeNote(note.toObject()));
  } catch (error) {
    console.error("PUT note error:", error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectDB();
    const deleted = await Note.findOneAndDelete({ _id: id, userId });
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE note error:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}

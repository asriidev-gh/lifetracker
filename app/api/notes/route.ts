import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { Note } from "@/models/Note";
import { isNoteCategoryKey, type NoteCategoryKey } from "@/lib/noteCategories";
import { normalizeNoteColorKey } from "@/lib/noteColors";

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
  colorKey?: string;
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
    colorKey: normalizeNoteColorKey(doc.colorKey),
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

export async function GET(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("archived") === "1";

    await connectDB();
    const notes = await Note.find({ userId, isArchived: includeArchived })
      .sort({ isPinned: -1, updatedAt: -1 })
      .lean();

    return NextResponse.json(notes.map((note) => serializeNote(note)));
  } catch (error) {
    console.error("GET notes error:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const rawTitle = typeof body?.title === "string" ? body.title : "";
    const content = typeof body?.content === "string" ? body.content : "";
    const noteTitle = pickNoteTitle(rawTitle, content);
    const categoryRaw = typeof body?.category === "string" ? body.category : "quick";
    const category: NoteCategoryKey = isNoteCategoryKey(categoryRaw) ? categoryRaw : "quick";
    const isPinned = typeof body?.isPinned === "boolean" ? body.isPinned : false;
    const colorKey = normalizeNoteColorKey(body?.colorKey);

    await connectDB();
    const created = await Note.create({
      userId,
      title: noteTitle,
      content,
      category,
      colorKey,
      isPinned,
      isArchived: false,
    });

    return NextResponse.json(serializeNote(created.toObject()));
  } catch (error) {
    console.error("POST notes error:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}

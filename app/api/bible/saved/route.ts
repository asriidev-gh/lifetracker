import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { BibleJourney } from "@/models/BibleJourney";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const body = await request.json();
    const type = body?.type as "highlight" | "bookmark";
    const reference = typeof body?.reference === "string" ? body.reference.trim() : "";
    const verse = typeof body?.verse === "number" ? body.verse : undefined;
    const text = typeof body?.text === "string" ? body.text.trim() : undefined;

    if (!["highlight", "bookmark"].includes(type) || !reference) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectDB();
    const journey = await BibleJourney.findOne({ userId });
    if (!journey) {
      return NextResponse.json({ error: "Plan not initialized" }, { status: 400 });
    }

    const existing = (journey.savedScriptures ?? []).find(
      (s) =>
        s.type === type &&
        s.reference === reference &&
        (s.verse ?? null) === (verse ?? null) &&
        (s.text ?? "") === (text ?? "")
    );
    if (existing) {
      return NextResponse.json({ ok: true, alreadySaved: true });
    }

    journey.savedScriptures = [
      ...(journey.savedScriptures ?? []),
      {
        type,
        reference,
        verse,
        text,
        createdAt: new Date().toISOString(),
      },
    ];

    await journey.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST bible/saved error:", error);
    return NextResponse.json({ error: "Failed to save scripture" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");
    const reference = searchParams.get("reference");
    const verseParam = searchParams.get("verse");
    const verse = verseParam !== null ? Number(verseParam) : undefined;
    const hasKeyCriteria = !!(type && reference);
    if (!id && !hasKeyCriteria) {
      return NextResponse.json(
        { error: "Provide id or type+reference to delete" },
        { status: 400 }
      );
    }

    await connectDB();
    const journey = await BibleJourney.findOne({ userId });
    if (!journey) {
      return NextResponse.json({ error: "Plan not initialized" }, { status: 400 });
    }

    journey.savedScriptures = (journey.savedScriptures ?? []).filter((s) => {
      if (id) {
        return String((s as { _id?: string })._id) !== id;
      }
      if (!type || !reference) return true;
      if (s.type !== type || s.reference !== reference) return true;
      if (typeof verse === "number" && !Number.isNaN(verse)) {
        return (s.verse ?? null) !== verse;
      }
      return false;
    });
    await journey.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE bible/saved error:", error);
    return NextResponse.json({ error: "Failed to delete saved scripture" }, { status: 500 });
  }
}

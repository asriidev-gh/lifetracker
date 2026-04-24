import mongoose from "mongoose";
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
    const word = typeof body?.word === "string" ? body.word.trim() : "";
    const meaning = typeof body?.meaning === "string" ? body.meaning.trim() : "";
    if (!word || !meaning) {
      return NextResponse.json(
        { error: "word and meaning are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const journey = await BibleJourney.findOne({ userId });
    if (!journey) {
      return NextResponse.json({ error: "Plan not initialized" }, { status: 400 });
    }

    journey.vocabulary = [
      ...(journey.vocabulary ?? []),
      {
        word,
        meaning,
        createdAt: new Date().toISOString(),
      },
    ];
    await journey.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST bible/vocabulary error:", error);
    return NextResponse.json(
      { error: "Failed to save vocabulary" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const word = typeof body?.word === "string" ? body.word.trim() : "";
    const meaning = typeof body?.meaning === "string" ? body.meaning.trim() : "";

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "valid id is required" }, { status: 400 });
    }
    if (!word || !meaning) {
      return NextResponse.json(
        { error: "word and meaning are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const journey = await BibleJourney.findOne({ userId });
    if (!journey) {
      return NextResponse.json({ error: "Plan not initialized" }, { status: 400 });
    }

    const entries = journey.vocabulary ?? [];
    const idx = entries.findIndex((v) => v._id != null && String(v._id) === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Vocabulary entry not found" }, { status: 404 });
    }

    entries[idx].word = word;
    entries[idx].meaning = meaning;
    journey.markModified("vocabulary");
    await journey.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH bible/vocabulary error:", error);
    return NextResponse.json(
      { error: "Failed to update vocabulary" },
      { status: 500 }
    );
  }
}

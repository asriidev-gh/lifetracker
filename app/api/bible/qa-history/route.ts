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
    const reference = typeof body?.reference === "string" ? body.reference.trim() : "";
    const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const answer = typeof body?.answer === "string" ? body.answer.trim() : "";

    if (!reference || !question || !answer) {
      return NextResponse.json({ error: "reference, question, and answer are required" }, { status: 400 });
    }

    await connectDB();
    const journey = await BibleJourney.findOne({ userId });
    if (!journey) {
      return NextResponse.json({ error: "Plan not initialized" }, { status: 400 });
    }

    journey.aiConversations = [
      ...(journey.aiConversations ?? []),
      {
        reference,
        summary: summary || undefined,
        question,
        answer,
        createdAt: new Date().toISOString(),
      },
    ];
    await journey.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST bible/qa-history error:", error);
    return NextResponse.json({ error: "Failed to save Q&A history" }, { status: 500 });
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
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await connectDB();
    const journey = await BibleJourney.findOne({ userId });
    if (!journey) {
      return NextResponse.json({ error: "Plan not initialized" }, { status: 400 });
    }

    journey.aiConversations = (journey.aiConversations ?? []).filter(
      (q) => String((q as { _id?: string })._id) !== id
    );
    await journey.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE bible/qa-history error:", error);
    return NextResponse.json({ error: "Failed to delete Q&A history" }, { status: 500 });
  }
}


import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type VerseLine = { verse: number; text: string };

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const reference = typeof body?.reference === "string" ? body.reference : "";
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const text = typeof body?.text === "string" ? body.text : "";
    const verses = Array.isArray(body?.verses) ? (body.verses as VerseLine[]) : [];

    if (!reference || !question || (!text && verses.length === 0)) {
      return NextResponse.json({ error: "Invalid question payload" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI Q&A unavailable. Add OPENAI_API_KEY in .env." },
        { status: 400 }
      );
    }

    const passageText =
      verses.length > 0
        ? verses.map((v) => `${v.verse}. ${v.text}`).join("\n")
        : text;

    const completionRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a Bible study assistant. Answer from the provided passage context with a warm, practical, beginner-friendly tone. Use this structure: 1) Direct answer (2-4 sentences), 2) Passage context (2-4 bullet points), 3) Practical takeaway (2-4 short lines). If the question cannot be answered clearly from the text, say so honestly and provide the closest faithful context. Target around 140-260 words unless the user asks for a short answer.",
          },
          {
            role: "user",
            content: `Passage: ${reference}\n\nText:\n${passageText}\n\nQuestion: ${question}`,
          },
        ],
      }),
    });

    if (!completionRes.ok) {
      return NextResponse.json({ error: "AI service unavailable right now." }, { status: 502 });
    }

    const data = await completionRes.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || answer.trim().length === 0) {
      return NextResponse.json({ error: "No answer generated." }, { status: 500 });
    }

    return NextResponse.json({ answer: answer.trim() });
  } catch (error) {
    console.error("POST bible/qa error:", error);
    return NextResponse.json({ error: "Failed to answer question" }, { status: 500 });
  }
}

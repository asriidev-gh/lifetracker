import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function fallbackMeaning(word: string) {
  return `${word}\n\nSimple meaning:\nA Bible vocabulary term explained in plain language.\n\nIn biblical context:\n- Used in Scripture to describe people, places, or spiritual ideas.\n- Meaning can vary by passage, so include context when studying.\n\nImportant idea:\nThis term helps connect historical context with God’s message and can point to gospel themes in the New Testament.`;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const word = typeof body?.word === "string" ? body.word.trim() : "";
    if (!word) {
      return NextResponse.json({ error: "word is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ meaning: fallbackMeaning(word), source: "fallback" });
    }

    const completionRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content:
              "You are a Bible study vocabulary assistant. Explain terms clearly for beginners in a warm, practical tone. Return 4 sections exactly in this format: 1) **<Word>**: <one-line definition> 2) Simple meaning: <1-2 short lines> 3) In biblical context: <2-4 bullet points> 4) Important idea: <2-4 short lines, include that salvation/message includes Jews and Gentiles when relevant>. Prefer 140-260 words total.",
          },
          {
            role: "user",
            content: `Define this vocabulary word for Bible study notes: ${word}`,
          },
        ],
      }),
    });

    if (!completionRes.ok) {
      return NextResponse.json({ meaning: fallbackMeaning(word), source: "fallback" });
    }

    const data = await completionRes.json();
    const meaning = data?.choices?.[0]?.message?.content;
    if (typeof meaning !== "string" || meaning.trim().length === 0) {
      return NextResponse.json({ meaning: fallbackMeaning(word), source: "fallback" });
    }

    return NextResponse.json({ meaning: meaning.trim(), source: "ai" });
  } catch (error) {
    console.error("POST bible/vocabulary-meaning error:", error);
    return NextResponse.json({ error: "Failed to generate meaning" }, { status: 500 });
  }
}

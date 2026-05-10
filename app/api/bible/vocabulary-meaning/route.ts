import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function fallbackMeaning(word: string, reference?: string, verseText?: string) {
  const ctx =
    reference && verseText
      ? `\n\nPassage: ${reference}\n${verseText}\n`
      : "\n";
  return `${word}${ctx}\nSimple meaning:\nA Bible vocabulary term explained in plain language.\n\nIn biblical context:\n- Used in Scripture to describe people, places, or spiritual ideas.\n- Meaning can vary by passage, so include context when studying.\n\nImportant idea:\nThis term helps connect historical context with God’s message and can point to gospel themes in the New Testament.`;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const word = typeof body?.word === "string" ? body.word.trim() : "";
    const reference = typeof body?.reference === "string" ? body.reference.trim() : "";
    const verseText = typeof body?.verseText === "string" ? body.verseText.trim() : "";
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!word) {
      return NextResponse.json({ error: "word is required" }, { status: 400 });
    }

    const hasPassageContext = reference.length > 0 && verseText.length > 0;
    const userContent = question
      ? `Target word: "${word}"\n\nQuestion: ${question}${
          hasPassageContext
            ? `\n\nScripture reference: ${reference}\nVerse text:\n${verseText}`
            : ""
        }\n\nAnswer this clearly for Bible study notes.`
      : hasPassageContext
        ? `Target word: "${word}"\n\nScripture reference: ${reference}\nVerse text:\n${verseText}\n\nExplain this word as it appears in this verse for Bible study notes.`
        : `Define this vocabulary word for Bible study notes: ${word}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        meaning: fallbackMeaning(word, reference || undefined, verseText || undefined),
        source: "fallback",
      });
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
              "You are a Bible study vocabulary assistant. Explain terms clearly for beginners in a warm, practical tone. When passage context is given, tie the explanation to that verse. Return 4 sections exactly in this format: 1) **<Word>**: <one-line definition> 2) Simple meaning: <1-2 short lines> 3) In biblical context: <2-4 bullet points> 4) Important idea: <2-4 short lines, include that salvation/message includes Jews and Gentiles when relevant>. Prefer 140-260 words total.",
          },
          {
            role: "user",
            content: userContent,
          },
        ],
      }),
    });

    if (!completionRes.ok) {
      return NextResponse.json({
        meaning: fallbackMeaning(word, reference || undefined, verseText || undefined),
        source: "fallback",
      });
    }

    const data = await completionRes.json();
    const meaning = data?.choices?.[0]?.message?.content;
    if (typeof meaning !== "string" || meaning.trim().length === 0) {
      return NextResponse.json({
        meaning: fallbackMeaning(word, reference || undefined, verseText || undefined),
        source: "fallback",
      });
    }

    return NextResponse.json({ meaning: meaning.trim(), source: "ai" });
  } catch (error) {
    console.error("POST bible/vocabulary-meaning error:", error);
    return NextResponse.json({ error: "Failed to generate meaning" }, { status: 500 });
  }
}

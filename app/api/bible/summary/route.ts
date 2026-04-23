import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type VerseLine = { verse: number; text: string };

function fallbackSummary(reference: string, verses: VerseLine[], fallbackText: string) {
  if (verses.length === 0) {
    const trimmed = fallbackText.replace(/\s+/g, " ").trim();
    if (!trimmed) return `Summary for ${reference} is unavailable right now.`;
    return trimmed.length > 420 ? `${trimmed.slice(0, 420)}...` : trimmed;
  }

  const cleaned = verses.map((v) => v.text.replace(/\s+/g, " ").trim()).filter(Boolean);
  const first = cleaned[0] ?? "";
  const middle = cleaned[Math.floor(cleaned.length / 2)] ?? "";
  const last = cleaned[cleaned.length - 1] ?? "";
  const unique = [first, middle, last].filter(
    (line, idx, arr) => line.length > 0 && arr.indexOf(line) === idx
  );
  const points = unique
    .slice(0, 3)
    .map((line) => (line.length > 180 ? `${line.slice(0, 180)}...` : line));
  return points.join(" ");
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const reference = typeof body?.reference === "string" ? body.reference : "";
    const text = typeof body?.text === "string" ? body.text : "";
    const verses = Array.isArray(body?.verses) ? (body.verses as VerseLine[]) : [];

    if (!reference || (!text && verses.length === 0)) {
      return NextResponse.json({ error: "Invalid summary payload" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        summary: fallbackSummary(reference, verses, text),
        source: "fallback",
      });
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
              "You are a Bible study assistant. Summarize chapters faithfully and concisely. Keep neutral tone. Output 3 bullet points and one short practical takeaway sentence.",
          },
          {
            role: "user",
            content: `Summarize ${reference} from this text:\n\n${passageText}`,
          },
        ],
      }),
    });

    if (!completionRes.ok) {
      return NextResponse.json({
        summary: fallbackSummary(reference, verses, text),
        source: "fallback",
      });
    }

    const data = await completionRes.json();
    const summary = data?.choices?.[0]?.message?.content;
    if (typeof summary !== "string" || summary.trim().length === 0) {
      return NextResponse.json({
        summary: fallbackSummary(reference, verses, text),
        source: "fallback",
      });
    }

    return NextResponse.json({ summary: summary.trim(), source: "ai" });
  } catch (error) {
    console.error("POST bible/summary error:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}

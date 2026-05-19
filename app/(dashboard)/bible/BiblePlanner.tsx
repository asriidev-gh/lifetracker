"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Settings, X } from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { findReadingKeyForReference } from "@/lib/bibleReadProgress";

type Reading = { stream: "OT" | "NT" | "Wisdom"; reference: string };
type ReadingLike = { stream: "OT" | "NT" | "Wisdom" | "History"; reference: string };
type VerseLine = { verse: number; text: string };
type HistoryEntry = {
  date: string;
  readings: string[];
  totalReadings: number;
};
type SavedScripture = {
  _id?: string;
  type: "highlight" | "bookmark";
  reference: string;
  verse?: number;
  text?: string;
  createdAt: string;
};
type QAHistoryItem = {
  _id?: string;
  reference: string;
  summary?: string;
  question: string;
  answer: string;
  createdAt: string;
};
type SummaryHistoryItem = {
  _id?: string;
  reference: string;
  summary: string;
  createdAt: string;
};
type VocabularyItem = {
  _id?: string;
  word: string;
  meaning: string;
  createdAt: string;
};
type PlanResponse = {
  today: string;
  completedToday: boolean;
  streak: { current: number; best: number };
  planType: "straight" | "mixed" | "chronological";
  catchUpMode: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  targetDate: string;
  chapterTarget: number;
  daysLeft: number;
  remainingChapters: number;
  readings: Reading[];
  readItemKeys?: string[];
  history: HistoryEntry[];
  savedScriptures: SavedScripture[];
  qaHistory: QAHistoryItem[];
  summaryHistory: SummaryHistoryItem[];
  vocabulary: VocabularyItem[];
};

const streamStyle: Record<Reading["stream"] | "History", string> = {
  OT: "bg-amber-500/20 text-amber-800 dark:text-amber-200",
  NT: "bg-blue-500/20 text-blue-800 dark:text-blue-200",
  Wisdom: "bg-green-500/20 text-green-800 dark:text-green-200",
  History: "bg-slate-500/20 text-slate-800 dark:text-slate-200",
};
const HISTORY_PAGE_SIZE = 5;

function getReadingKey(item: ReadingLike) {
  return `${item.stream}::${item.reference}`;
}

function getUtcDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function normalizeReference(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getChapterReference(value: string) {
  return normalizeReference(value).replace(/:\d.*$/, "").trim();
}

/** Strip leading/trailing punctuation so "Galilee." → "Galilee" for vocab keys. */
function stripWordForVocab(raw: string): string {
  return raw
    .replace(/^[\s"'“”‘’.,;:!?()[\]{}—–-]+/g, "")
    .replace(/[\s"'“”‘’.,;:!?()[\]{}—–-]+$/g, "")
    .trim();
}

function readerTokenIsAskable(raw: string): boolean {
  return /[A-Za-z\u00C0-\u024F]/.test(raw);
}

function normalizeVocabLookup(raw: string): string {
  return stripWordForVocab(raw).toLowerCase();
}

function splitReaderTextIntoParts(text: string, keyPrefix: string | number) {
  const parts: { key: string; text: string; isWord: boolean }[] = [];
  const re = /\S+/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push({
        key: `${keyPrefix}-sp-${lastIndex}`,
        text: text.slice(lastIndex, m.index),
        isWord: false,
      });
    }
    parts.push({
      key: `${keyPrefix}-w-${m.index}`,
      text: m[0],
      isWord: true,
    });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({
      key: `${keyPrefix}-sp-${lastIndex}`,
      text: text.slice(lastIndex),
      isWord: false,
    });
  }
  return parts;
}

function getLatestQaDateKey(items: QAHistoryItem[]) {
  if (items.length === 0) return null;
  return items
    .map((item) => getUtcDateKey(item.createdAt))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

export function BiblePlanner() {
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audioBusy, setAudioBusy] = useState<string | null>(null);
  const [speakingReference, setSpeakingReference] = useState<string | null>(null);
  const [audioPaused, setAudioPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerReference, setReaderReference] = useState("");
  const [readerText, setReaderText] = useState("");
  const [readerVerses, setReaderVerses] = useState<VerseLine[]>([]);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState("");
  type ReaderAskAnchor = {
    top: number;
    left: number;
    wordRaw: string;
    wordDisplay: string;
    verse: number;
    verseText: string;
    reference: string;
  };
  const [readerAskAnchor, setReaderAskAnchor] = useState<ReaderAskAnchor | null>(null);
  const [readerAskBusy, setReaderAskBusy] = useState(false);
  const [readerAskQuestion, setReaderAskQuestion] = useState("");
  const [readerAskAnswer, setReaderAskAnswer] = useState("");
  const [readerAskError, setReaderAskError] = useState("");
  const [readerAskSaved, setReaderAskSaved] = useState(false);
  const [readerAskSaving, setReaderAskSaving] = useState(false);
  const readerAskDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readerAskPopoverRef = useRef<HTMLDivElement | null>(null);
  /** True while the lookup panel is showing; avoids closing when the pointer crosses other words. */
  const readerAskPopoverOpenRef = useRef(false);
  const [showSavedSummaries, setShowSavedSummaries] = useState(false);
  const [showAiQaSection, setShowAiQaSection] = useState(false);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState("");
  const [qaSaved, setQaSaved] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [savingScripture, setSavingScripture] = useState(false);
  const [highlightedVerseKeys, setHighlightedVerseKeys] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<
    "today" | "history" | "saved" | "summary" | "qa" | "vocabulary"
  >("today");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [qaPage, setQaPage] = useState(1);
  const [summaryPage, setSummaryPage] = useState(1);
  const [qaChapterFilter, setQaChapterFilter] = useState("all");
  const [qaDayFilter, setQaDayFilter] = useState("all");
  const [qaSortOrder, setQaSortOrder] = useState<"desc" | "asc">("desc");
  const [savedChapterFilter, setSavedChapterFilter] = useState("all");
  const [summaryChapterFilter, setSummaryChapterFilter] = useState("all");
  const [summaryDayFilter, setSummaryDayFilter] = useState("all");
  const [summarySortOrder, setSummarySortOrder] = useState<"desc" | "asc">("desc");
  const [savedScopedChapters, setSavedScopedChapters] = useState<string[] | null>(null);
  const [qaScopedChapters, setQaScopedChapters] = useState<string[] | null>(null);
  const [summaryScopedChapters, setSummaryScopedChapters] = useState<string[] | null>(null);
  const [vocabularyOpen, setVocabularyOpen] = useState(false);
  const [vocabularyEditId, setVocabularyEditId] = useState<string | null>(null);
  const [vocabularyWord, setVocabularyWord] = useState("");
  const [vocabularyMeaning, setVocabularyMeaning] = useState("");
  const [vocabularySearch, setVocabularySearch] = useState("");
  const [vocabularySaving, setVocabularySaving] = useState(false);
  const [vocabularyAiLoading, setVocabularyAiLoading] = useState(false);
  const [readItemKeys, setReadItemKeys] = useState<string[]>([]);
  const [reviewHistoryDate, setReviewHistoryDate] = useState<string | null>(null);
  const [reviewHistoryReadings, setReviewHistoryReadings] = useState<string[]>([]);

  function getVerseKey(reference: string, verse?: number) {
    return `${reference}::${verse ?? 0}`;
  }

  function openHistoryInTodayView(entry: HistoryEntry) {
    const uniqueReadings = Array.from(new Set(entry.readings));
    setReviewHistoryDate(entry.date);
    setReviewHistoryReadings(uniqueReadings);
    setReadItemKeys(uniqueReadings.map((reference) => `History::${reference}`));
    setActiveView("today");
  }

  function getHistoryChapterScope(readings: string[]) {
    return Array.from(new Set(readings.map((ref) => getChapterReference(ref))));
  }

  function showSuccess(title: string) {
    return Swal.fire({
      icon: "success",
      title,
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: "top-end",
    });
  }

  function showError(title: string) {
    return Swal.fire({
      icon: "error",
      title,
      timer: 2200,
      showConfirmButton: false,
      toast: true,
      position: "top-end",
    });
  }

  const loadPlan = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const res = await fetch("/api/bible/today");
      const data = await res.json();
      if (res.ok) {
        setPlan(data);
        if (Array.isArray(data.readItemKeys)) {
          setReadItemKeys(data.readItemKeys);
        }
        setQaDayFilter((current) => {
          if (current !== "all") return current;
          const latestQaDateKey = getLatestQaDateKey(
            Array.isArray(data?.qaHistory) ? data.qaHistory : []
          );
          if (latestQaDateKey) {
            setQaPage(1);
            return latestQaDateKey;
          }
          return current;
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (readerOpen) return;
    if (readerAskDelayRef.current) {
      clearTimeout(readerAskDelayRef.current);
      readerAskDelayRef.current = null;
    }
    readerAskPopoverOpenRef.current = false;
    setReaderAskAnchor(null);
    setReaderAskBusy(false);
  }, [readerOpen]);

  useEffect(() => {
    if (!plan) return;
    const filteredQaCount = plan.qaHistory.filter((item) => {
      const chapterMatch =
        qaChapterFilter === "all" || item.reference === qaChapterFilter;
      const dayMatch =
        qaDayFilter === "all" ||
        getUtcDateKey(item.createdAt) === qaDayFilter;
      return chapterMatch && dayMatch;
    }).length;
    const filteredSummaryCount =
      plan.summaryHistory.filter((item) => {
        const chapterMatch =
          summaryChapterFilter === "all" ||
          item.reference === summaryChapterFilter;
        const dayMatch =
          summaryDayFilter === "all" ||
          getUtcDateKey(item.createdAt) === summaryDayFilter;
        return chapterMatch && dayMatch;
      }).length;
    const nextQaTotalPages = Math.max(1, Math.ceil(filteredQaCount / HISTORY_PAGE_SIZE));
    const nextSummaryTotalPages = Math.max(1, Math.ceil(filteredSummaryCount / HISTORY_PAGE_SIZE));
    if (qaPage > nextQaTotalPages) setQaPage(nextQaTotalPages);
    if (summaryPage > nextSummaryTotalPages) setSummaryPage(nextSummaryTotalPages);
  }, [plan, qaPage, summaryPage, qaChapterFilter, qaDayFilter, summaryChapterFilter, summaryDayFilter]);

  useEffect(() => {
    if (!plan || qaChapterFilter === "all") return;
    const hasMatch = plan.qaHistory.some(
      (item) =>
        item.reference === qaChapterFilter &&
        (qaDayFilter === "all" || getUtcDateKey(item.createdAt) === qaDayFilter)
    );
    if (!hasMatch) {
      setQaChapterFilter("all");
    }
  }, [plan, qaChapterFilter, qaDayFilter]);

  useEffect(() => {
    if (!plan || summaryChapterFilter === "all") return;
    const hasMatch = plan.summaryHistory.some(
      (item) =>
        item.reference === summaryChapterFilter &&
        (summaryDayFilter === "all" ||
          getUtcDateKey(item.createdAt) === summaryDayFilter)
    );
    if (!hasMatch) {
      setSummaryChapterFilter("all");
    }
  }, [plan, summaryChapterFilter, summaryDayFilter]);

  useEffect(() => {
    if (!plan || savedChapterFilter !== "all") return;
    const latestHighlight = [...(plan.savedScriptures ?? [])]
      .filter(
        (item) => item.type === "highlight" && typeof item.reference === "string"
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? "").getTime() -
          new Date(a.createdAt ?? "").getTime()
      )[0];
    if (latestHighlight?.reference) {
      setSavedChapterFilter(latestHighlight.reference);
    }
  }, [plan, savedChapterFilter]);

  useEffect(() => {
    if (!reviewHistoryDate) return;
    const stillExists = plan?.history.some((entry) => entry.date === reviewHistoryDate);
    if (!stillExists) {
      setReviewHistoryDate(null);
      setReviewHistoryReadings([]);
    }
  }, [plan, reviewHistoryDate]);

  async function toggleCatchUp() {
    if (!plan) return;
    const next = !plan.catchUpMode;
    const res = await fetch("/api/bible/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catchUpMode: next }),
    });
    if (res.ok) {
      setPlan({ ...plan, catchUpMode: next });
      loadPlan();
    }
  }

  async function changePlanType(nextType: "straight" | "mixed" | "chronological") {
    if (!plan || plan.planType === nextType) return;
    const res = await fetch("/api/bible/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planType: nextType }),
    });
    if (res.ok) {
      await loadPlan();
    }
  }

  async function syncReadMarker(key: string, read: boolean) {
    if (!plan || reviewHistoryDate !== null) return;
    try {
      const res = await fetch("/api/bible/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, read }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.readItemKeys)) {
          setReadItemKeys(data.readItemKeys);
        }
      }
    } catch {
      // Optimistic UI already updated.
    }
  }

  function markReferenceReadInList(reference: string) {
    if (!plan) return;
    const readKey = findReadingKeyForReference(reference, plan.readings);
    if (!readKey) return;
    setReadItemKeys((prev) => (prev.includes(readKey) ? prev : [...prev, readKey]));
  }

  async function markComplete() {
    setSaving(true);
    try {
      const res = await fetch("/api/bible/complete", { method: "POST" });
      if (res.ok) {
        await loadPlan();
        await showSuccess("Reading progress updated");
      } else {
        await showError("Failed to update reading progress");
      }
    } finally {
      setSaving(false);
    }
  }

  async function resetProgress() {
    const decision = await Swal.fire({
      icon: "warning",
      title: "Reset reading progress?",
      text: "This will reset reading progress. This cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Yes, reset",
      cancelButtonText: "Cancel",
    });
    if (!decision.isConfirmed) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/bible/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetProgress: true }),
      });
      if (res.ok) {
        await loadPlan();
        await showSuccess("Progress has been reset");
      } else {
        await showError("Failed to reset progress");
      }
    } finally {
      setSaving(false);
    }
  }

  async function readAloud(reference: string) {
    if (speakingReference === reference && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setSpeakingReference(null);
      setAudioPaused(false);
      return;
    }

    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setAudioPaused(false);
    setAudioBusy(reference);
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`);
      const data = await res.json();
      const text = typeof data?.text === "string" ? data.text.trim() : "";
      if (!text) return;
      const utterance = new SpeechSynthesisUtterance(`${reference}. ${text}`);
      utterance.rate = 0.95;
      utterance.onend = () => {
        setSpeakingReference(null);
        setAudioPaused(false);
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        setSpeakingReference(null);
        setAudioPaused(false);
        utteranceRef.current = null;
      };
      utteranceRef.current = utterance;
      setSpeakingReference(reference);
      window.speechSynthesis.speak(utterance);
    } catch {
      // Silent fail keeps UI gentle.
      setSpeakingReference(null);
      setAudioPaused(false);
    } finally {
      setAudioBusy(null);
    }
  }

  function pauseAudio() {
    if (!window.speechSynthesis.speaking || window.speechSynthesis.paused) return;
    window.speechSynthesis.pause();
    setAudioPaused(true);
  }

  function resumeAudio() {
    if (!window.speechSynthesis.paused) return;
    window.speechSynthesis.resume();
    setAudioPaused(false);
  }

  function stopAudio() {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeakingReference(null);
    setAudioPaused(false);
  }

  async function openReader(reference: string) {
    if (readerAskDelayRef.current) {
      clearTimeout(readerAskDelayRef.current);
      readerAskDelayRef.current = null;
    }
    readerAskPopoverOpenRef.current = false;
    setReaderAskAnchor(null);
    setReaderAskBusy(false);
    setReaderReference(reference);
    setReaderText("");
    setReaderVerses([]);
    setReaderError("");
    setShowSavedSummaries(false);
    setShowAiQaSection(false);
    setQaQuestion("");
    setQaAnswer("");
    setQaError("");
    setQaSaved(false);
    setReaderOpen(true);
    setReaderLoading(true);
    const savedHighlights = (plan?.savedScriptures ?? [])
      .filter((s) => s.type === "highlight" && s.reference === reference && typeof s.verse === "number")
      .map((s) => getVerseKey(reference, s.verse));
    setHighlightedVerseKeys(savedHighlights);
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`);
      const data = await res.json();
      const text = typeof data?.text === "string" ? data.text.trim() : "";
      const verses: VerseLine[] = Array.isArray(data?.verses)
        ? data.verses
            .map((v: { verse?: number; text?: string }) => ({
              verse: typeof v.verse === "number" ? v.verse : 0,
              text: typeof v.text === "string" ? v.text.trim() : "",
            }))
            .filter((v: VerseLine) => v.verse > 0 && v.text.length > 0)
        : [];
      if (!text) {
        setReaderError("No passage text found for this reference.");
        return;
      }
      setReaderText(text);
      setReaderVerses(verses);
    } catch {
      setReaderError("Unable to load passage right now. Please try again.");
    } finally {
      setReaderLoading(false);
    }
  }

  function clearReaderAskDelayTimer() {
    if (readerAskDelayRef.current) {
      clearTimeout(readerAskDelayRef.current);
      readerAskDelayRef.current = null;
    }
  }

  function dismissReaderAskPopover() {
    clearReaderAskDelayTimer();
    readerAskPopoverOpenRef.current = false;
    setReaderAskAnchor(null);
    setReaderAskQuestion("");
    setReaderAskAnswer("");
    setReaderAskError("");
    setReaderAskSaved(false);
    setReaderAskSaving(false);
  }

  function handleReaderWordEnter(
    e: React.MouseEvent<HTMLSpanElement>,
    rawToken: string,
    verse: number,
    verseFullText: string
  ) {
    if (readerAskPopoverOpenRef.current) {
      return;
    }
    clearReaderAskDelayTimer();
    if (!readerTokenIsAskable(rawToken)) return;
    const el = e.currentTarget;
    readerAskDelayRef.current = setTimeout(() => {
      readerAskDelayRef.current = null;
      const r = el.getBoundingClientRect();
      const wordDisplay = stripWordForVocab(rawToken) || rawToken;
      const maxLeft =
        typeof window !== "undefined" ? Math.max(8, window.innerWidth - 220) : r.left;
      readerAskPopoverOpenRef.current = true;
      setReaderAskQuestion(`What does "${wordDisplay}" mean in this verse?`);
      setReaderAskAnswer("");
      setReaderAskError("");
      setReaderAskSaved(false);
      setReaderAskAnchor({
        top: r.bottom + 6,
        left: Math.min(r.left, maxLeft),
        wordRaw: rawToken,
        wordDisplay,
        verse,
        verseText: verseFullText,
        reference: readerReference,
      });
    }, 3000);
  }

  function handleReaderWordLeave() {
    if (readerAskPopoverOpenRef.current) {
      return;
    }
    clearReaderAskDelayTimer();
  }

  async function askReaderWordFromReader(anchor: ReaderAskAnchor) {
    const word = anchor.wordDisplay.trim();
    if (!word) {
      await showError("Nothing to look up");
      return;
    }
    const question = readerAskQuestion.trim();
    if (!question) {
      setReaderAskError("Please enter a question first.");
      return;
    }
    setReaderAskBusy(true);
    setReaderAskError("");
    setReaderAskSaved(false);
    try {
      const verseLine =
        anchor.verse > 0
          ? `${anchor.reference} verse ${anchor.verse}: ${anchor.verseText}`
          : `${anchor.reference}: ${anchor.verseText}`;
      const meaningRes = await fetch("/api/bible/vocabulary-meaning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          reference: anchor.reference,
          verseText: verseLine,
          question,
        }),
      });
      const meaningData = await meaningRes.json();
      if (!meaningRes.ok) {
        setReaderAskAnswer("");
        setReaderAskError(meaningData?.error ?? "Failed to get meaning");
        return;
      }
      const meaning =
        typeof meaningData?.meaning === "string" ? meaningData.meaning.trim() : "";
      if (!meaning) {
        setReaderAskAnswer("");
        setReaderAskError("No answer returned");
        return;
      }
      setReaderAskAnswer(meaning);
    } finally {
      setReaderAskBusy(false);
    }
  }

  async function saveReaderAskAnswer(anchor: ReaderAskAnchor) {
    const word = anchor.wordDisplay.trim();
    const meaning = readerAskAnswer.trim();
    if (!word || !meaning) {
      setReaderAskError("Ask first before saving.");
      return;
    }
    setReaderAskSaving(true);
    setReaderAskError("");
    try {
      const vocabList = plan?.vocabulary ?? [];
      const match = vocabList.find(
        (v) => normalizeVocabLookup(v.word) === normalizeVocabLookup(word)
      );

      let saveRes: Response;
      if (match?._id) {
        saveRes = await fetch("/api/bible/vocabulary", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: String(match._id),
            word,
            meaning,
          }),
        });
      } else {
        saveRes = await fetch("/api/bible/vocabulary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ word, meaning }),
        });
      }

      if (!saveRes.ok) {
        setReaderAskError("Failed to save vocabulary");
        return;
      }
      await loadPlan(true);
      setReaderAskSaved(true);
      await showSuccess("Saved to vocabulary");
    } finally {
      setReaderAskSaving(false);
    }
  }

  async function askQuestion() {
    if (qaAnswer) {
      setQaQuestion("");
      setQaAnswer("");
      setQaError("");
      setQaSaved(false);
      return;
    }
    if (!readerReference || !qaQuestion.trim()) return;
    setQaLoading(true);
    setQaError("");
    setQaSaved(false);
    try {
      const res = await fetch("/api/bible/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: readerReference,
          question: qaQuestion.trim(),
          verses: readerVerses,
          text: readerText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQaAnswer("");
        setQaError(data?.error ?? "Unable to answer right now.");
        return;
      }
      setQaAnswer(typeof data?.answer === "string" ? data.answer : "");
    } catch {
      setQaError("Unable to answer right now.");
    } finally {
      setQaLoading(false);
    }
  }

  async function saveQAConversation() {
    if (!readerReference || !qaQuestion.trim() || !qaAnswer.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/bible/qa-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: readerReference,
          summary: savedSummariesForReference[0]?.summary ?? "",
          question: qaQuestion.trim(),
          answer: qaAnswer.trim(),
        }),
      });
      if (res.ok) {
        await loadPlan(true);
        setQaQuestion("");
        setQaAnswer("");
        setQaError("");
        setQaSaved(false);
        await showSuccess("Q&A saved");
      } else {
        await showError("Failed to save Q&A");
      }
    } finally {
      setSaving(false);
    }
  }

  async function generateSummaryForCurrentReference() {
    if (!readerReference || !readerText.trim()) return;
    setSummaryLoading(true);
    try {
      const generateRes = await fetch("/api/bible/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: readerReference,
          verses: readerVerses,
          text: readerText,
        }),
      });
      const generated = await generateRes.json();
      const summary = typeof generated?.summary === "string" ? generated.summary.trim() : "";
      if (!generateRes.ok || !summary) {
        await showError("Failed to generate summary");
        return;
      }

      const saveRes = await fetch("/api/bible/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: readerReference,
          summary,
        }),
      });

      if (!saveRes.ok) {
        await showError("Generated, but failed to save summary");
        return;
      }

      const saved = await saveRes.json();
      if (typeof saved?.readKey === "string") {
        setReadItemKeys((prev) =>
          prev.includes(saved.readKey) ? prev : [...prev, saved.readKey]
        );
      } else {
        markReferenceReadInList(readerReference);
      }

      await loadPlan(true);
      setShowSavedSummaries(true);
      await showSuccess("Summary generated and chapter marked as read");
    } catch {
      await showError("Failed to generate summary");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function saveVocabulary() {
    const word = vocabularyWord.trim();
    const meaning = vocabularyMeaning.trim();
    if (!word || !meaning) {
      await showError("Word and meaning are required");
      return;
    }
    setVocabularySaving(true);
    try {
      const isEdit = vocabularyEditId != null;
      const res = await fetch("/api/bible/vocabulary", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit ? { id: vocabularyEditId, word, meaning } : { word, meaning }
        ),
      });
      if (!res.ok) {
        await showError(isEdit ? "Failed to update vocabulary" : "Failed to save vocabulary");
        return;
      }
      await loadPlan(true);
      setVocabularyWord("");
      setVocabularyMeaning("");
      setVocabularyEditId(null);
      setVocabularyOpen(false);
      await showSuccess(isEdit ? "Vocabulary updated" : "Vocabulary saved");
    } finally {
      setVocabularySaving(false);
    }
  }

  async function askAiVocabularyMeaning() {
    const word = vocabularyWord.trim();
    if (!word) {
      await showError("Enter a word first");
      return;
    }
    setVocabularyAiLoading(true);
    try {
      const res = await fetch("/api/bible/vocabulary-meaning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
      });
      const data = await res.json();
      if (!res.ok) {
        await showError(data?.error ?? "Failed to generate meaning");
        return;
      }
      if (typeof data?.meaning === "string" && data.meaning.trim().length > 0) {
        setVocabularyMeaning(data.meaning.trim());
      } else {
        await showError("No meaning generated");
      }
    } finally {
      setVocabularyAiLoading(false);
    }
  }

  async function removeSavedScriptureByKey(type: "highlight", reference: string, verse?: number) {
    const qs = new URLSearchParams({
      type,
      reference,
    });
    if (typeof verse === "number") qs.set("verse", String(verse));
    const res = await fetch(`/api/bible/saved?${qs.toString()}`, { method: "DELETE" });
    if (res.ok) {
      await loadPlan(true);
    }
    return res.ok;
  }

  async function toggleVerseScripture(type: "highlight", reference: string, verse: number, text: string) {
    const key = getVerseKey(reference, verse);
    const isActive = highlightedVerseKeys.includes(key);

    setSavingScripture(true);
    try {
      if (isActive) {
        const ok = await removeSavedScriptureByKey(type, reference, verse);
        if (ok) {
          setHighlightedVerseKeys((prev) => prev.filter((v) => v !== key));
        }
      } else {
        const res = await fetch("/api/bible/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, reference, verse, text }),
        });
        if (res.ok) {
          setHighlightedVerseKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
          await loadPlan(true);
        }
      }
    } finally {
      setSavingScripture(false);
    }
  }

  async function removeSavedScripture(id?: string) {
    if (!id) return;
    const decision = await Swal.fire({
      icon: "warning",
      title: "Delete saved scripture?",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!decision.isConfirmed) return;
    const res = await fetch(`/api/bible/saved?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadPlan();
      await showSuccess("Saved scripture deleted");
    } else {
      await showError("Failed to delete saved scripture");
    }
  }

  async function removeSummaryHistory(id?: string) {
    if (!id) return;
    const decision = await Swal.fire({
      icon: "warning",
      title: "Delete chapter summary?",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!decision.isConfirmed) return;
    const res = await fetch(`/api/bible/summaries?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadPlan();
      await showSuccess("Summary deleted");
    } else {
      await showError("Failed to delete summary");
    }
  }

  async function removeQAHistory(id?: string) {
    if (!id) return;
    const decision = await Swal.fire({
      icon: "warning",
      title: "Delete AI Q&A item?",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (!decision.isConfirmed) return;
    const res = await fetch(`/api/bible/qa-history?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadPlan();
      await showSuccess("Q&A item deleted");
    } else {
      await showError("Failed to delete Q&A item");
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading Bible Journey...</p>;
  }

  if (!plan) {
    return <p className="text-destructive">Unable to load your Bible Journey.</p>;
  }

  const highlightedSavedScriptures = plan.savedScriptures.filter(
    (item) => item.type === "highlight"
  );
  const highlightedByReference = (() => {
    const map = new Map<string, SavedScripture[]>();
    for (const item of highlightedSavedScriptures) {
      const list = map.get(item.reference) ?? [];
      list.push(item);
      map.set(item.reference, list);
    }
    return Array.from(map.entries())
      .map(([reference, items]) => ({
        reference,
        items: [...items].sort((a, b) => {
          const verseA = a.verse ?? Number.MAX_SAFE_INTEGER;
          const verseB = b.verse ?? Number.MAX_SAFE_INTEGER;
          if (verseA !== verseB) return verseA - verseB;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }),
      }))
      .sort((a, b) => a.reference.localeCompare(b.reference));
  })();
  const savedChapterOptions = highlightedByReference.map((group) => group.reference);
  const savedScopedChapterSet = savedScopedChapters
    ? new Set(savedScopedChapters.map((ref) => getChapterReference(ref)))
    : null;
  const filteredHighlightedByReference =
    highlightedByReference.filter((group) => {
      const chapterFilterMatch =
        savedChapterFilter === "all" || group.reference === savedChapterFilter;
      const scopeMatch =
        !savedScopedChapterSet ||
        savedScopedChapterSet.has(getChapterReference(group.reference));
      return chapterFilterMatch && scopeMatch;
    });
  const qaDayNumberByDate = (() => {
    const usedDates = new Set<string>();
    for (const item of plan.qaHistory) {
      usedDates.add(getUtcDateKey(item.createdAt));
    }
    const datesAsc = Array.from(usedDates).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    const map = new Map<string, number>();
    datesAsc.forEach((dateKey, index) => {
      map.set(dateKey, index + 1);
    });
    return map;
  })();
  const qaDayOptions = (() => {
    return Array.from(qaDayNumberByDate.keys())
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((dateKey) => {
        const dayNumber = qaDayNumberByDate.get(dateKey) ?? 1;
        return {
          value: dateKey,
          label: `Day ${dayNumber} (${dateKey})`,
        };
      });
  })();
  const qaChapterOptions = (() => {
    const qaItemsForSelectedDay =
      qaDayFilter === "all"
        ? plan.qaHistory
        : plan.qaHistory.filter(
            (item) => getUtcDateKey(item.createdAt) === qaDayFilter
          );
    // Keep chapter labels aligned with Q&A day numbering.
    const earliestByReference = new Map<string, number>();
    const qaDayByReference = new Map<string, number>();
    for (const item of qaItemsForSelectedDay) {
      const ts = new Date(item.createdAt).getTime();
      const current = earliestByReference.get(item.reference);
      if (current === undefined || ts < current) {
        earliestByReference.set(item.reference, ts);
      }
      const dayForQaDate = qaDayNumberByDate.get(getUtcDateKey(item.createdAt));
      if (dayForQaDate !== undefined) {
        const existing = qaDayByReference.get(item.reference);
        if (existing === undefined || dayForQaDate < existing) {
          qaDayByReference.set(item.reference, dayForQaDate);
        }
      }
    }

    return Array.from(new Set(qaItemsForSelectedDay.map((item) => item.reference)))
      .sort((a, b) => {
        const dayA = qaDayByReference.get(a);
        const dayB = qaDayByReference.get(b);
        if (dayA !== undefined && dayB !== undefined && dayA !== dayB) {
          return dayA - dayB;
        }
        if (dayA !== undefined && dayB === undefined) return -1;
        if (dayA === undefined && dayB !== undefined) return 1;
        return (earliestByReference.get(a) ?? 0) - (earliestByReference.get(b) ?? 0);
      })
      .map((reference, index) => {
        const day = qaDayByReference.get(reference);
        return {
          reference,
          label: `${reference} (Day ${day ?? index + 1})`,
        };
      });
  })();
  const filteredQaHistory =
    plan.qaHistory.filter((item) => {
      const chapterMatch =
        qaChapterFilter === "all" || item.reference === qaChapterFilter;
      const dayMatch =
        qaDayFilter === "all" ||
        getUtcDateKey(item.createdAt) === qaDayFilter;
      const scopeMatch =
        !qaScopedChapters ||
        qaScopedChapters.includes(getChapterReference(item.reference));
      return chapterMatch && dayMatch && scopeMatch;
    });
  const sortedQaHistory = [...filteredQaHistory].sort((a, b) => {
    const at = new Date(a.createdAt).getTime();
    const bt = new Date(b.createdAt).getTime();
    return qaSortOrder === "asc" ? at - bt : bt - at;
  });
  const qaTotalPages = Math.max(1, Math.ceil(sortedQaHistory.length / HISTORY_PAGE_SIZE));
  const summaryDayNumberByDate = (() => {
    const usedDates = new Set<string>();
    for (const item of plan.summaryHistory) {
      usedDates.add(getUtcDateKey(item.createdAt));
    }
    const datesAsc = Array.from(usedDates).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    const map = new Map<string, number>();
    datesAsc.forEach((dateKey, index) => {
      map.set(dateKey, index + 1);
    });
    return map;
  })();
  const summaryScopedChapterSet = summaryScopedChapters
    ? new Set(summaryScopedChapters.map((ref) => getChapterReference(ref)))
    : null;
  const summaryHistoryForSelectedDay =
    summaryDayFilter === "all"
      ? plan.summaryHistory
      : plan.summaryHistory.filter(
          (item) => getUtcDateKey(item.createdAt) === summaryDayFilter
        );
  const summaryChapterOptions = Array.from(
    new Set(summaryHistoryForSelectedDay.map((item) => item.reference))
  )
    .map((reference) => {
      const related = summaryHistoryForSelectedDay.filter(
        (item) => item.reference === reference
      );
      const earliest = related
        .map((item) => getUtcDateKey(item.createdAt))
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
      const day = earliest ? summaryDayNumberByDate.get(earliest) : undefined;
      return {
        reference,
        label: `${reference} (Day ${day ?? 1})`,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  const summaryDayOptions = (() => {
    return Array.from(summaryDayNumberByDate.keys())
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map((dateKey) => ({
        value: dateKey,
        label: `Day ${summaryDayNumberByDate.get(dateKey) ?? 1} (${dateKey})`,
      }));
  })();
  const filteredSummaryHistory =
    plan.summaryHistory.filter((item) => {
      const chapterMatch =
        summaryChapterFilter === "all" ||
        item.reference === summaryChapterFilter;
      const dayMatch =
        summaryDayFilter === "all" ||
        getUtcDateKey(item.createdAt) === summaryDayFilter;
      const scopeMatch =
        !summaryScopedChapterSet ||
        summaryScopedChapterSet.has(getChapterReference(item.reference));
      return chapterMatch && dayMatch && scopeMatch;
    });
  const sortedSummaryHistory = [...filteredSummaryHistory].sort((a, b) => {
    const at = new Date(a.createdAt).getTime();
    const bt = new Date(b.createdAt).getTime();
    return summarySortOrder === "asc" ? at - bt : bt - at;
  });
  const summaryTotalPages = Math.max(1, Math.ceil(sortedSummaryHistory.length / HISTORY_PAGE_SIZE));
  const paginatedQAHistory = sortedQaHistory.slice(
    (qaPage - 1) * HISTORY_PAGE_SIZE,
    qaPage * HISTORY_PAGE_SIZE
  );
  const paginatedSummaryHistory = sortedSummaryHistory.slice(
    (summaryPage - 1) * HISTORY_PAGE_SIZE,
    summaryPage * HISTORY_PAGE_SIZE
  );
  const readerChapterReference = getChapterReference(readerReference);
  const savedSummariesForReference = plan.summaryHistory.filter(
    (item) => getChapterReference(item.reference) === readerChapterReference
  );
  const relatedQaForReference = plan.qaHistory
    .filter((item) => getChapterReference(item.reference) === readerChapterReference)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  const filteredVocabulary = plan.vocabulary.filter((item) =>
    item.word.toLowerCase().includes(vocabularySearch.trim().toLowerCase())
  );
  const allReadItemsChecked =
    plan.readings.length > 0 &&
    plan.readings.every((item) => readItemKeys.includes(getReadingKey(item)));
  const isHistoryReviewMode = reviewHistoryDate !== null;
  const visibleReadings: ReadingLike[] =
    isHistoryReviewMode
      ? reviewHistoryReadings.map((reference) => ({ stream: "History", reference }))
      : plan.readings;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>1-Year Bible Journey</CardTitle>
            <p className="text-sm text-muted-foreground">
              Free source: bible-api.com (no API key), flexible reading modes, and streak support.
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open Bible Journey settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Current streak</p>
            <p className="text-2xl font-semibold">{plan.streak.current} days</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Best streak</p>
            <p className="text-2xl font-semibold">{plan.streak.best} days</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Today&apos;s chapters</p>
            <p className="text-2xl font-semibold">{plan.chapterTarget}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Days left to target</p>
            <p className="text-2xl font-semibold">{plan.daysLeft}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bible Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={activeView === "today" ? "default" : "outline"}
              onClick={() => setActiveView("today")}
            >
              Today
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeView === "history" ? "default" : "outline"}
              onClick={() => setActiveView("history")}
            >
              Reading History
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeView === "saved" ? "default" : "outline"}
              onClick={() => setActiveView("saved")}
            >
              Saved Scriptures
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeView === "qa" ? "default" : "outline"}
              onClick={() => setActiveView("qa")}
            >
              AI Q&A History
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeView === "summary" ? "default" : "outline"}
              onClick={() => setActiveView("summary")}
            >
              Chapter Summaries
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeView === "vocabulary" ? "default" : "outline"}
              onClick={() => setActiveView("vocabulary")}
            >
              Vocabulary
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeView === "today" && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              {isHistoryReviewMode
                ? `Reading Review (${reviewHistoryDate})`
                : "Today's Readings"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isHistoryReviewMode
                ? "Review chapters from a previous day and reopen them in the reader."
                : "Short + balanced reading list. Catch-up keeps you on pace for your target date."}
            </p>
          </div>
          {isHistoryReviewMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReviewHistoryDate(null);
                setReviewHistoryReadings([]);
                setReadItemKeys([]);
              }}
            >
              Back to today
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={toggleCatchUp}>
              Catch-up mode: {plan.catchUpMode ? "On" : "Off"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleReadings.map((item) => (
            <div key={`${item.stream}-${item.reference}`} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${streamStyle[item.stream]}`}>
                  {item.stream}
                </span>
                <span className="font-medium">{item.reference}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant={readItemKeys.includes(getReadingKey(item)) ? "default" : "outline"}
                  className="h-8 w-8 rounded-full"
                  onClick={() => {
                    const key = getReadingKey(item);
                    const nextRead = !readItemKeys.includes(key);
                    setReadItemKeys((prev) =>
                      nextRead ? [...prev, key] : prev.filter((v) => v !== key)
                    );
                    if (!isHistoryReviewMode) {
                      void syncReadMarker(key, nextRead);
                    }
                  }}
                  aria-label={
                    readItemKeys.includes(getReadingKey(item))
                      ? `Unmark ${item.reference} as read`
                      : `Mark ${item.reference} as read`
                  }
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => readAloud(item.reference)}>
                  {audioBusy === item.reference
                    ? "Loading..."
                    : speakingReference === item.reference
                      ? "Stop Audio"
                      : "Audio"}
                </Button>
                {speakingReference === item.reference && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={audioPaused ? resumeAudio : pauseAudio}
                  >
                    {audioPaused ? "Resume" : "Pause"}
                  </Button>
                )}
                <Button type="button" size="sm" variant="secondary" onClick={() => openReader(item.reference)}>
                  Read
                </Button>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              {isHistoryReviewMode
                ? "You are reviewing a previous reading day."
                : `Gentle reminders are stored in your journey (${plan.reminderEnabled ? "enabled" : "disabled"} at ${plan.reminderTime}).`}
            </p>
            <div className="flex items-center gap-2">
              {speakingReference && (
                <Button type="button" variant="ghost" onClick={stopAudio}>
                  Stop audio
                </Button>
              )}
              {!isHistoryReviewMode && (
                <Button
                  type="button"
                  onClick={markComplete}
                  disabled={
                    saving ||
                    (plan.completedToday && !plan.catchUpMode) ||
                    !allReadItemsChecked
                  }
                >
                  {saving
                    ? "Saving..."
                    : plan.completedToday
                      ? plan.catchUpMode
                        ? "Completed today (read next)"
                        : "Completed today"
                      : allReadItemsChecked
                        ? "Mark today complete"
                        : "Mark all items as read first"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {activeView === "history" && (
      <Card>
        <CardHeader>
          <CardTitle>Reading History</CardTitle>
          <p className="text-sm text-muted-foreground">
            Summary of books/chapters you completed each day.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {plan.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No history yet. Complete your reading today to start logging.
            </p>
          ) : (
            plan.history.map((entry) => (
              <div key={entry.date} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">{entry.date}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {entry.totalReadings} {entry.totalReadings === 1 ? "reading" : "readings"}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => openHistoryInTodayView(entry)}
                    >
                      Open in Today
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const historyScope = getHistoryChapterScope(entry.readings);
                        setSummaryDayFilter("all");
                        setSummaryChapterFilter("all");
                        setSummaryScopedChapters(historyScope);
                        setSummaryPage(1);
                        setActiveView("summary");
                      }}
                    >
                      Chapter Summaries
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setQaDayFilter(entry.date);
                        setQaChapterFilter("all");
                        setQaScopedChapters(getHistoryChapterScope(entry.readings));
                        setQaPage(1);
                        setActiveView("qa");
                      }}
                    >
                      AI Q&A
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {entry.readings.join(", ")}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      )}

      {activeView === "saved" && (
      <Card>
        <CardHeader>
          <CardTitle>Saved Scriptures</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your highlighted scriptures for quick revisit.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {highlightedSavedScriptures.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Filter by chapter:</p>
              <Select
                value={savedChapterFilter}
                onValueChange={(value) => {
                  setSavedChapterFilter(value);
                  setSavedScopedChapters(null);
                }}
              >
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="All chapters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All chapters</SelectItem>
                  {savedChapterOptions.map((reference) => (
                    <SelectItem key={reference} value={reference}>
                      {reference}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {highlightedSavedScriptures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No highlighted scriptures yet.
            </p>
          ) : filteredHighlightedByReference.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No highlights found for this chapter filter.
            </p>
          ) : (
            filteredHighlightedByReference.map((group) => (
              <div key={group.reference} className="rounded-lg border p-3">
                <p className="mb-2 font-medium">{group.reference}</p>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div
                      key={item._id ?? `${item.type}-${item.reference}-${item.verse ?? 0}`}
                      className="rounded-md border bg-background p-2"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:text-yellow-200">
                            Highlight
                          </span>
                          <p className="font-medium">
                            {item.reference}
                            {item.verse ? `:${item.verse}` : ""}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="transition-colors hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => removeSavedScripture(item._id)}
                        >
                          Remove
                        </Button>
                      </div>
                      {item.text && (
                        <p className="text-sm text-muted-foreground">{item.text}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Saved {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      )}

      {activeView === "qa" && (
      <Card>
        <CardHeader>
          <CardTitle>AI Q&A History</CardTitle>
          <p className="text-sm text-muted-foreground">
            Revisit your saved chapter summary and questions anytime.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {plan.qaHistory.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Filter by day:</p>
              <Select
                value={qaDayFilter}
                onValueChange={(value) => {
                  setQaDayFilter(value);
                  setQaScopedChapters(null);
                  setQaPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="All days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All days</SelectItem>
                  {qaDayOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm font-medium">Filter by chapter:</p>
              <Select
                value={qaChapterFilter}
                onValueChange={(value) => {
                  setQaChapterFilter(value);
                  setQaScopedChapters(null);
                  setQaPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="All chapters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All chapters</SelectItem>
                  {qaChapterOptions.map((option) => (
                    <SelectItem key={option.reference} value={option.reference}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm font-medium">Sort by created:</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setQaSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
                  setQaPage(1);
                }}
              >
                {qaSortOrder === "desc" ? "Newest first" : "Oldest first"}
              </Button>
            </div>
          )}
          {filteredQaHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {plan.qaHistory.length === 0
                ? "No saved Q&A yet. Save one from the reader modal."
                : "No Q&A found for this chapter filter."}
            </p>
          ) : (
            paginatedQAHistory.map((item) => (
              <div key={item._id ?? `${item.reference}-${item.createdAt}`} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">{item.reference}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="transition-colors hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeQAHistory(item._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {item.summary && (
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Summary:</span> {item.summary}
                  </p>
                )}
                <p className="text-sm">
                  <span className="font-medium">Q:</span> {item.question}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">A:</span> {item.answer}
                </p>
              </div>
            ))
          )}
          {filteredQaHistory.length > HISTORY_PAGE_SIZE && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setQaPage((p) => Math.max(1, p - 1))}
                disabled={qaPage === 1}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {qaPage} of {qaTotalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setQaPage((p) => Math.min(qaTotalPages, p + 1))}
                disabled={qaPage === qaTotalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {activeView === "summary" && (
      <Card>
        <CardHeader>
          <CardTitle>Chapter Summary History</CardTitle>
          <p className="text-sm text-muted-foreground">
            Saved chapter summaries for quick review.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {plan.summaryHistory.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Filter by day:</p>
              <Select
                value={summaryDayFilter}
                onValueChange={(value) => {
                  setSummaryDayFilter(value);
                  setSummaryScopedChapters(null);
                  setSummaryPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="All days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All days</SelectItem>
                  {summaryDayOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm font-medium">Filter by chapter:</p>
              <Select
                value={summaryChapterFilter}
                onValueChange={(value) => {
                  setSummaryChapterFilter(value);
                  setSummaryScopedChapters(null);
                  setSummaryPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="All chapters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All chapters</SelectItem>
                  {summaryChapterOptions.map((option) => (
                    <SelectItem key={option.reference} value={option.reference}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm font-medium">Sort by created:</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSummarySortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
                  setSummaryPage(1);
                }}
              >
                {summarySortOrder === "desc" ? "Newest first" : "Oldest first"}
              </Button>
            </div>
          )}
          {filteredSummaryHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {plan.summaryHistory.length === 0
                ? "No saved summaries yet. Generate and save from the reader modal."
                : "No summaries found for this chapter filter."}
            </p>
          ) : (
            paginatedSummaryHistory.map((item) => (
              <div key={item._id ?? `${item.reference}-${item.createdAt}`} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">{item.reference}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="transition-colors hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeSummaryHistory(item._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{item.summary}</p>
              </div>
            ))
          )}
          {filteredSummaryHistory.length > HISTORY_PAGE_SIZE && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setSummaryPage((p) => Math.max(1, p - 1))}
                disabled={summaryPage === 1}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {summaryPage} of {summaryTotalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setSummaryPage((p) => Math.min(summaryTotalPages, p + 1))}
                disabled={summaryPage === summaryTotalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {activeView === "vocabulary" && (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Vocabulary</CardTitle>
            <p className="text-sm text-muted-foreground">
              Save important words from your study and search them quickly.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setVocabularyEditId(null);
              setVocabularyWord("");
              setVocabularyMeaning("");
              setVocabularyOpen(true);
            }}
          >
            Add Vocabulary
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={vocabularySearch}
            onChange={(e) => setVocabularySearch(e.target.value)}
            placeholder="Search word..."
          />
          {filteredVocabulary.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {plan.vocabulary.length === 0
                ? "No vocabulary saved yet."
                : "No word matches your search."}
            </p>
          ) : (
            filteredVocabulary.map((item) => (
              <div
                key={item._id ?? `${item.word}-${item.createdAt}`}
                className="rounded-lg border p-3"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-medium">{item.word}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    {item._id ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setVocabularyEditId(String(item._id));
                          setVocabularyWord(item.word);
                          setVocabularyMeaning(item.meaning);
                          setVocabularyOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {item.meaning}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      )}

      <Dialog modal={false} open={readerOpen} onOpenChange={setReaderOpen}>
        <DialogContent
          className="max-h-[90vh] max-w-3xl overflow-y-auto"
          onInteractOutside={(event) => {
            const target = event.target as Node | null;
            if (target && readerAskPopoverRef.current?.contains(target)) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{readerReference || "Reading"}</DialogTitle>
            <p className="text-left text-xs font-normal text-muted-foreground">
              Hover a word for 3 seconds to open the lookup panel. Click Ask to look it up and save it
              to your vocabulary, or the ✕ on the panel to close it.
            </p>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-muted/30 p-4">
            {readerLoading ? (
              <p className="text-sm text-muted-foreground">Loading passage...</p>
            ) : readerError ? (
              <p className="text-sm text-destructive">{readerError}</p>
            ) : readerVerses.length > 0 ? (
              <div className="space-y-1">
                {readerVerses.map((line) => (
                  <div
                    key={`${readerReference}-${line.verse}`}
                    className={`rounded px-1 py-1 transition-colors ${
                      highlightedVerseKeys.includes(getVerseKey(readerReference, line.verse))
                        ? "bg-yellow-300/40 dark:bg-yellow-400/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm leading-7">
                        <sup className="mr-1 text-xs text-muted-foreground">{line.verse}</sup>
                        {splitReaderTextIntoParts(line.text, line.verse).map((part) =>
                          part.isWord ? (
                            <span
                              key={part.key}
                              className={
                                readerTokenIsAskable(part.text)
                                  ? "rounded px-0.5 hover:bg-muted/70"
                                  : undefined
                              }
                              onMouseEnter={(e) => {
                                if (!readerTokenIsAskable(part.text)) return;
                                handleReaderWordEnter(e, part.text, line.verse, line.text);
                              }}
                              onMouseLeave={() => {
                                if (!readerTokenIsAskable(part.text)) return;
                                handleReaderWordLeave();
                              }}
                            >
                              {part.text}
                            </span>
                          ) : (
                            <span key={part.key}>{part.text}</span>
                          )
                        )}
                      </p>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={savingScripture}
                          onClick={() =>
                            toggleVerseScripture("highlight", readerReference, line.verse, line.text)
                          }
                        >
                          {highlightedVerseKeys.includes(getVerseKey(readerReference, line.verse))
                            ? "Unhighlight"
                            : "Highlight"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="whitespace-pre-line text-sm leading-7">
                {splitReaderTextIntoParts(readerText, "plain").map((part) =>
                  part.isWord ? (
                    <span
                      key={part.key}
                      className={
                        readerTokenIsAskable(part.text)
                          ? "rounded px-0.5 hover:bg-muted/70"
                          : undefined
                      }
                      onMouseEnter={(e) => {
                        if (!readerTokenIsAskable(part.text)) return;
                        handleReaderWordEnter(e, part.text, 0, readerText);
                      }}
                      onMouseLeave={() => {
                        if (!readerTokenIsAskable(part.text)) return;
                        handleReaderWordLeave();
                      }}
                    >
                      {part.text}
                    </span>
                  ) : (
                    <span key={part.key}>{part.text}</span>
                  )
                )}
              </p>
            )}
          </div>
          <div className="flex items-center justify-end">
            {savedSummariesForReference.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowSavedSummaries((prev) => !prev)}
              >
                {showSavedSummaries
                  ? "Hide Summary"
                  : "Show Summary"}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={generateSummaryForCurrentReference}
                disabled={summaryLoading || readerLoading || !readerText.trim()}
              >
                {summaryLoading ? "Generating..." : "Generate Summary"}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowAiQaSection((prev) => !prev)}
            >
              {showAiQaSection ? "Hide AI Q&A" : "Show AI Q&A"}
            </Button>
          </div>
          {showSavedSummaries && savedSummariesForReference.length > 0 && (
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="mb-2 text-sm font-medium">Saved summaries for {readerReference}</p>
              <div className="space-y-2">
                {savedSummariesForReference.map((item) => (
                  <div
                    key={item._id ?? `${item.reference}-${item.createdAt}`}
                    className="rounded-md border bg-background p-2"
                  >
                    <p className="mb-1 text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {item.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {showAiQaSection && (
            <div className="rounded-md border bg-muted/20 p-3 space-y-3">
              <div>
                <p className="mb-2 text-sm font-medium">Related saved Q&A</p>
                {relatedQaForReference.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No saved Q&A yet for this chapter.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border bg-background p-2">
                    {relatedQaForReference.map((item) => (
                      <div
                        key={item._id ?? `${item.reference}-${item.createdAt}`}
                        className="rounded border p-2 text-sm"
                      >
                        <p>
                          <span className="font-medium">Q:</span> {item.question}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-muted-foreground">
                          <span className="font-medium text-foreground">A:</span> {item.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Ask AI about this chapter</p>
                <textarea
                  value={qaQuestion}
                  onChange={(e) => setQaQuestion(e.target.value)}
                  placeholder="Ask a question about this chapter..."
                  className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={askQuestion}
                    disabled={qaLoading || (!qaAnswer && !qaQuestion.trim()) || readerLoading}
                  >
                    {qaLoading ? "Thinking..." : qaAnswer ? "Ask Again" : "Ask"}
                  </Button>
                </div>
                {qaError && <p className="mt-2 text-sm text-destructive">{qaError}</p>}
                {qaAnswer && (
                  <div className="mt-2 rounded-md border bg-background p-3 text-sm">
                    <p className="mb-1 font-medium">Answer</p>
                    <p className="whitespace-pre-line text-muted-foreground">{qaAnswer}</p>
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={saveQAConversation}
                        disabled={saving || qaSaved}
                      >
                        {qaSaved ? "Saved" : saving ? "Saving..." : "Save Q&A"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReaderOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={vocabularyOpen}
        onOpenChange={(open) => {
          setVocabularyOpen(open);
          if (!open) {
            setVocabularyEditId(null);
            setVocabularyWord("");
            setVocabularyMeaning("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {vocabularyEditId ? "Edit Vocabulary" : "Add Vocabulary"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Word</p>
              <div className="flex gap-2">
                <Input
                  value={vocabularyWord}
                  onChange={(e) => setVocabularyWord(e.target.value)}
                  placeholder="Enter word..."
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={askAiVocabularyMeaning}
                  disabled={vocabularyAiLoading || !vocabularyWord.trim()}
                >
                  {vocabularyAiLoading ? "Asking..." : "Ask AI"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Meaning</p>
              <textarea
                value={vocabularyMeaning}
                onChange={(e) => setVocabularyMeaning(e.target.value)}
                placeholder="Enter meaning..."
                className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVocabularyOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveVocabulary}
                disabled={vocabularySaving}
              >
                {vocabularySaving
                  ? vocabularyEditId
                    ? "Updating..."
                    : "Saving..."
                  : vocabularyEditId
                    ? "Update"
                    : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bible Journey Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Reading mode</p>
              <Select
                value={plan.planType}
                onValueChange={(v) => changePlanType(v as "straight" | "mixed" | "chronological")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight">Straight through (Genesis to Revelation)</SelectItem>
                  <SelectItem value="mixed">Mixed daily (OT + NT + Psalms/Proverbs)</SelectItem>
                  <SelectItem value="chronological">Chronological order</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Changing mode restarts progress from chapter 1.
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="destructive" onClick={resetProgress} disabled={saving}>
                Reset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {readerAskAnchor &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={readerAskPopoverRef}
            role="dialog"
            aria-label="Word lookup"
            className="fixed z-[200] w-[min(340px,calc(100vw-16px))] max-h-[min(70vh,420px)] overflow-y-auto rounded-md border bg-background p-2 shadow-lg"
            style={{
              top: readerAskAnchor.top,
              left: readerAskAnchor.left,
            }}
          >
            <div className="mb-2 flex items-start justify-between gap-1">
              <p
                className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
                title={readerAskAnchor.wordDisplay}
              >
                {readerAskAnchor.wordDisplay}
              </p>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0"
                aria-label="Close"
                onClick={dismissReaderAskPopover}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2">
              <textarea
                value={readerAskQuestion}
                onChange={(e) => {
                  setReaderAskQuestion(e.target.value);
                  setReaderAskSaved(false);
                }}
                placeholder={`Ask about "${readerAskAnchor.wordDisplay}"...`}
                className="min-h-[70px] w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => void askReaderWordFromReader(readerAskAnchor)}
              disabled={readerAskBusy}
            >
              {readerAskBusy ? "Working..." : "Ask"}
            </Button>
            {readerAskError ? (
              <p className="mt-2 text-xs text-destructive">{readerAskError}</p>
            ) : null}
            {readerAskAnswer ? (
              <div className="mt-2 space-y-2 rounded-md border bg-muted/20 p-2">
                <p className="text-xs font-medium">Answer</p>
                <p className="max-h-48 overflow-y-auto whitespace-pre-line text-xs leading-5 text-muted-foreground">
                  {readerAskAnswer}
                </p>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void saveReaderAskAnswer(readerAskAnchor)}
                    disabled={readerAskSaving || readerAskSaved}
                  >
                    {readerAskSaved ? "Saved" : readerAskSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>,
          document.body
        )}
    </div>
  );
}

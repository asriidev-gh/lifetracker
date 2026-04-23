import { IBibleJourney } from "@/models/BibleJourney";

type BookDef = { name: string; chapters: number };

const OT_BOOKS: BookDef[] = [
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 },
  { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Kings", chapters: 22 },
  { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 },
  { name: "2 Chronicles", chapters: 36 },
  { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 },
  { name: "Esther", chapters: 10 },
  { name: "Job", chapters: 42 },
  { name: "Isaiah", chapters: 66 },
  { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 },
  { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 },
  { name: "Joel", chapters: 3 },
  { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 },
  { name: "Jonah", chapters: 4 },
  { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Habakkuk", chapters: 3 },
  { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 },
  { name: "Zechariah", chapters: 14 },
  { name: "Malachi", chapters: 4 },
];

const NT_BOOKS: BookDef[] = [
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 },
  { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 },
  { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 },
  { name: "Revelation", chapters: 22 },
];

const STRAIGHT_BOOKS: BookDef[] = [...OT_BOOKS, ...NT_BOOKS];
const CHRONOLOGICAL_BOOKS: BookDef[] = [
  { name: "Genesis", chapters: 50 },
  { name: "Job", chapters: 42 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 },
  { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "Psalms", chapters: 150 },
  { name: "1 Chronicles", chapters: 29 },
  { name: "Proverbs", chapters: 31 },
  { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Solomon", chapters: 8 },
  { name: "1 Kings", chapters: 22 },
  { name: "2 Kings", chapters: 25 },
  { name: "2 Chronicles", chapters: 36 },
  { name: "Jonah", chapters: 4 },
  { name: "Amos", chapters: 9 },
  { name: "Hosea", chapters: 14 },
  { name: "Isaiah", chapters: 66 },
  { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Zephaniah", chapters: 3 },
  { name: "Jeremiah", chapters: 52 },
  { name: "Habakkuk", chapters: 3 },
  { name: "Lamentations", chapters: 5 },
  { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Obadiah", chapters: 1 },
  { name: "Joel", chapters: 3 },
  { name: "Ezra", chapters: 10 },
  { name: "Haggai", chapters: 2 },
  { name: "Zechariah", chapters: 14 },
  { name: "Esther", chapters: 10 },
  { name: "Nehemiah", chapters: 13 },
  { name: "Malachi", chapters: 4 },
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "James", chapters: 5 },
  { name: "Galatians", chapters: 6 },
  { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 },
  { name: "Romans", chapters: 16 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 },
  { name: "Philemon", chapters: 1 },
  { name: "1 Timothy", chapters: 6 },
  { name: "Titus", chapters: 3 },
  { name: "1 Peter", chapters: 5 },
  { name: "2 Timothy", chapters: 4 },
  { name: "2 Peter", chapters: 3 },
  { name: "Hebrews", chapters: 13 },
  { name: "Jude", chapters: 1 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Revelation", chapters: 22 },
];

type Pointer = { bookIdx: number; chapter: number };
type Reading = { stream: "OT" | "NT" | "Wisdom"; reference: string };
type PlanType = IBibleJourney["planType"];
type NextPointers = {
  otBookIdx?: number;
  otChapter?: number;
  ntBookIdx?: number;
  ntChapter?: number;
  wisdomTrack?: "psalms" | "proverbs";
  wisdomChapter?: number;
  straightBookIdx?: number;
  straightChapter?: number;
  chronologicalBookIdx?: number;
  chronologicalChapter?: number;
};
type BuildPlanResult = {
  readings: Reading[];
  chapterTarget: number;
  nextPointers: NextPointers;
  remainingChapters: number;
  daysLeft: number;
};

const TOTAL_CHAPTERS = 1189;

function diffDaysInclusive(from: Date, to: Date) {
  const ms = 24 * 60 * 60 * 1000;
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const t = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.max(1, Math.floor((t - f) / ms) + 1);
}

function nextPointer(pointer: Pointer, books: BookDef[]): Pointer {
  const currentBook = books[pointer.bookIdx];
  if (pointer.chapter < currentBook.chapters) {
    return { bookIdx: pointer.bookIdx, chapter: pointer.chapter + 1 };
  }
  if (pointer.bookIdx < books.length - 1) {
    return { bookIdx: pointer.bookIdx + 1, chapter: 1 };
  }
  return { bookIdx: 0, chapter: 1 };
}

function readFromPointer(pointer: Pointer, books: BookDef[]) {
  const book = books[pointer.bookIdx];
  return {
    reference: `${book.name} ${pointer.chapter}`,
    next: nextPointer(pointer, books),
  };
}

function nextWisdom(track: "psalms" | "proverbs", chapter: number) {
  if (track === "psalms") {
    if (chapter < 150) return { track: "psalms" as const, chapter: chapter + 1 };
    return { track: "proverbs" as const, chapter: 1 };
  }
  if (chapter < 31) return { track: "proverbs" as const, chapter: chapter + 1 };
  return { track: "psalms" as const, chapter: 1 };
}

function readWisdom(track: "psalms" | "proverbs", chapter: number) {
  const reference = `${track === "psalms" ? "Psalms" : "Proverbs"} ${chapter}`;
  const next = nextWisdom(track, chapter);
  return { reference, next };
}

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function buildTodayReadings(journey: IBibleJourney): BuildPlanResult {
  const today = new Date();
  const remaining = Math.max(0, TOTAL_CHAPTERS - (journey.completedChapters ?? 0));
  const daysLeft = diffDaysInclusive(today, new Date(journey.targetDate));

  const dynamicTarget = Math.ceil(remaining / daysLeft);
  const balancedTarget = journey.catchUpMode ? dynamicTarget : 3;
  const chapterTarget = Math.min(6, Math.max(2, balancedTarget));
  const planType: PlanType = journey.planType ?? "mixed";

  if (planType === "straight") {
    const readings: Reading[] = [];
    let pointer: Pointer = {
      bookIdx: journey.straightBookIdx ?? 0,
      chapter: journey.straightChapter ?? 1,
    };
    for (let i = 0; i < chapterTarget; i++) {
      const next = readFromPointer(pointer, STRAIGHT_BOOKS);
      readings.push({ stream: "OT", reference: next.reference });
      pointer = next.next;
    }
    return {
      readings,
      chapterTarget,
      nextPointers: {
        straightBookIdx: pointer.bookIdx,
        straightChapter: pointer.chapter,
      },
      remainingChapters: remaining,
      daysLeft,
    };
  }

  if (planType === "chronological") {
    const readings: Reading[] = [];
    let pointer: Pointer = {
      bookIdx: journey.chronologicalBookIdx ?? 0,
      chapter: journey.chronologicalChapter ?? 1,
    };
    for (let i = 0; i < chapterTarget; i++) {
      const next = readFromPointer(pointer, CHRONOLOGICAL_BOOKS);
      readings.push({ stream: "OT", reference: next.reference });
      pointer = next.next;
    }
    return {
      readings,
      chapterTarget,
      nextPointers: {
        chronologicalBookIdx: pointer.bookIdx,
        chronologicalChapter: pointer.chapter,
      },
      remainingChapters: remaining,
      daysLeft,
    };
  }

  const readings: Reading[] = [];
  let otPointer: Pointer = { bookIdx: journey.otBookIdx, chapter: journey.otChapter };
  let ntPointer: Pointer = { bookIdx: journey.ntBookIdx, chapter: journey.ntChapter };
  let wisdomTrack = journey.wisdomTrack;
  let wisdomChapter = journey.wisdomChapter;

  const nt = readFromPointer(ntPointer, NT_BOOKS);
  readings.push({ stream: "NT", reference: nt.reference });
  ntPointer = nt.next;

  const wisdom = readWisdom(wisdomTrack, wisdomChapter);
  readings.push({ stream: "Wisdom", reference: wisdom.reference });
  wisdomTrack = wisdom.next.track;
  wisdomChapter = wisdom.next.chapter;

  while (readings.length < chapterTarget) {
    const ot = readFromPointer(otPointer, OT_BOOKS);
    readings.push({ stream: "OT", reference: ot.reference });
    otPointer = ot.next;
  }

  return {
    readings,
    chapterTarget,
    nextPointers: {
      otBookIdx: otPointer.bookIdx,
      otChapter: otPointer.chapter,
      ntBookIdx: ntPointer.bookIdx,
      ntChapter: ntPointer.chapter,
      wisdomTrack,
      wisdomChapter,
    },
    remainingChapters: remaining,
    daysLeft,
  };
}

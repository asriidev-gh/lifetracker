import type { IBibleJourney } from "@/models/BibleJourney";

export function getReadingKey(stream: string, reference: string) {
  return `${stream}::${reference}`;
}

export function normalizeChapterReference(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/:\d.*$/, "")
    .trim();
}

export function findReadingKeyForReference(
  reference: string,
  readings: { stream: string; reference: string }[]
): string | null {
  const chapterRef = normalizeChapterReference(reference);
  const match = readings.find(
    (item) => normalizeChapterReference(item.reference) === chapterRef
  );
  return match ? getReadingKey(match.stream, match.reference) : null;
}

export function getTodayReadKeys(
  journey: IBibleJourney,
  today: string,
  readings: { stream: string; reference: string }[]
): string[] {
  const progress = journey.todayReadProgress;
  if (!progress || progress.date !== today) return [];
  const allowed = new Set(
    readings.map((item) => getReadingKey(item.stream, item.reference))
  );
  return progress.readKeys.filter((key) => allowed.has(key));
}

export function setTodayReadKey(
  journey: IBibleJourney,
  today: string,
  key: string,
  read: boolean
) {
  if (!journey.todayReadProgress || journey.todayReadProgress.date !== today) {
    journey.todayReadProgress = { date: today, readKeys: read ? [key] : [] };
    return;
  }
  const keys = journey.todayReadProgress.readKeys ?? [];
  if (read) {
    if (!keys.includes(key)) {
      journey.todayReadProgress.readKeys = [...keys, key];
    }
    return;
  }
  journey.todayReadProgress.readKeys = keys.filter((value) => value !== key);
}

export function markReferenceReadToday(
  journey: IBibleJourney,
  today: string,
  reference: string,
  readings: { stream: string; reference: string }[]
): string | null {
  const key = findReadingKeyForReference(reference, readings);
  if (!key) return null;
  setTodayReadKey(journey, today, key, true);
  return key;
}

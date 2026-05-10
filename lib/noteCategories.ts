export const NOTE_CATEGORY_KEYS = [
  "work",
  "personal",
  "ideas",
  "finance",
  "learning",
  "spiritual",
  "quick",
] as const;

export type NoteCategoryKey = (typeof NOTE_CATEGORY_KEYS)[number];

export const NOTE_CATEGORY_LABELS: Record<NoteCategoryKey, string> = {
  work: "Work",
  personal: "Personal",
  ideas: "Ideas",
  finance: "Finance",
  learning: "Learning",
  spiritual: "Spiritual",
  quick: "Quick",
};

export const NOTE_CATEGORY_OPTIONS = NOTE_CATEGORY_KEYS.map((key) => ({
  key,
  label: NOTE_CATEGORY_LABELS[key],
}));

export function isNoteCategoryKey(value: string): value is NoteCategoryKey {
  return (NOTE_CATEGORY_KEYS as readonly string[]).includes(value);
}

export function getNoteCategoryLabel(value: string): string {
  if (isNoteCategoryKey(value)) return NOTE_CATEGORY_LABELS[value];
  return NOTE_CATEGORY_LABELS.quick;
}

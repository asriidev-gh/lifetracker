export const NOTE_COLOR_KEYS = [
  "default",
  "sky",
  "rose",
  "amber",
  "emerald",
  "violet",
  "orange",
  "cyan",
  "fuchsia",
  "lime",
  "slate",
] as const;

export type NoteColorKey = (typeof NOTE_COLOR_KEYS)[number];

export const NOTE_COLOR_OPTIONS = NOTE_COLOR_KEYS.map((key) => ({
  key,
  label: key === "default" ? "Default" : key.charAt(0).toUpperCase() + key.slice(1),
}));

/** Soft notepad background for list items and editor panel */
export const NOTE_PAD_BG_CLASSES: Record<string, string> = {
  default: "bg-card",
  sky: "bg-sky-100/90 dark:bg-sky-950/50 border-sky-200/70 dark:border-sky-800/60",
  rose: "bg-rose-100/90 dark:bg-rose-950/50 border-rose-200/70 dark:border-rose-800/60",
  amber: "bg-amber-100/90 dark:bg-amber-950/50 border-amber-200/70 dark:border-amber-800/60",
  emerald:
    "bg-emerald-100/90 dark:bg-emerald-950/50 border-emerald-200/70 dark:border-emerald-800/60",
  violet: "bg-violet-100/90 dark:bg-violet-950/50 border-violet-200/70 dark:border-violet-800/60",
  orange: "bg-orange-100/90 dark:bg-orange-950/50 border-orange-200/70 dark:border-orange-800/60",
  cyan: "bg-cyan-100/90 dark:bg-cyan-950/50 border-cyan-200/70 dark:border-cyan-800/60",
  fuchsia:
    "bg-fuchsia-100/90 dark:bg-fuchsia-950/50 border-fuchsia-200/70 dark:border-fuchsia-800/60",
  lime: "bg-lime-100/90 dark:bg-lime-950/50 border-lime-200/70 dark:border-lime-800/60",
  slate: "bg-slate-100/90 dark:bg-slate-950/50 border-slate-200/70 dark:border-slate-800/60",
};

/** Swatch preview in color picker */
export const NOTE_COLOR_SWATCH_CLASSES: Record<string, string> = {
  default: "bg-background border-border",
  sky: "bg-sky-300 dark:bg-sky-600",
  rose: "bg-rose-300 dark:bg-rose-600",
  amber: "bg-amber-300 dark:bg-amber-600",
  emerald: "bg-emerald-300 dark:bg-emerald-600",
  violet: "bg-violet-300 dark:bg-violet-600",
  orange: "bg-orange-300 dark:bg-orange-600",
  cyan: "bg-cyan-300 dark:bg-cyan-600",
  fuchsia: "bg-fuchsia-300 dark:bg-fuchsia-600",
  lime: "bg-lime-300 dark:bg-lime-600",
  slate: "bg-slate-300 dark:bg-slate-600",
};

export function isNoteColorKey(value: string): value is NoteColorKey {
  return (NOTE_COLOR_KEYS as readonly string[]).includes(value);
}

export function normalizeNoteColorKey(value: unknown): NoteColorKey {
  return typeof value === "string" && isNoteColorKey(value) ? value : "default";
}

export function getNotePadBgClass(colorKey: string) {
  return NOTE_PAD_BG_CLASSES[colorKey] ?? NOTE_PAD_BG_CLASSES.default;
}

export function getNoteColorSwatchClass(colorKey: string) {
  return NOTE_COLOR_SWATCH_CLASSES[colorKey] ?? NOTE_COLOR_SWATCH_CLASSES.default;
}

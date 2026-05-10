export const CALENDAR_MARK_COLOR_KEYS = [
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

export type CalendarMarkColorKey = (typeof CALENDAR_MARK_COLOR_KEYS)[number];

export const MARK_COLOR_OPTIONS = CALENDAR_MARK_COLOR_KEYS.map((key) => ({
  key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

/** Chip / pill styles for calendar cells and lists */
export const MARK_CHIP_CLASSES: Record<string, string> = {
  sky: "bg-sky-500/25 text-sky-950 dark:text-sky-100 border border-sky-500/35",
  rose: "bg-rose-500/25 text-rose-950 dark:text-rose-100 border border-rose-500/35",
  amber: "bg-amber-500/25 text-amber-950 dark:text-amber-100 border border-amber-500/35",
  emerald: "bg-emerald-500/25 text-emerald-950 dark:text-emerald-100 border border-emerald-500/35",
  violet: "bg-violet-500/25 text-violet-950 dark:text-violet-100 border border-violet-500/35",
  orange: "bg-orange-500/25 text-orange-950 dark:text-orange-100 border border-orange-500/35",
  cyan: "bg-cyan-500/25 text-cyan-950 dark:text-cyan-100 border border-cyan-500/35",
  fuchsia: "bg-fuchsia-500/25 text-fuchsia-950 dark:text-fuchsia-100 border border-fuchsia-500/35",
  lime: "bg-lime-500/25 text-lime-950 dark:text-lime-100 border border-lime-500/35",
  slate: "bg-slate-500/25 text-slate-950 dark:text-slate-100 border border-slate-500/35",
};

export function getMarkChipClass(colorKey: string) {
  return MARK_CHIP_CLASSES[colorKey] ?? MARK_CHIP_CLASSES.sky;
}

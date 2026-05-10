export function serializeCalendarMark(doc: {
  _id: unknown;
  userId: unknown;
  date: Date;
  title: string;
  details?: string;
  colorKey: string;
}) {
  const base = {
    _id: String(doc._id),
    userId: String(doc.userId),
    date: doc.date instanceof Date ? doc.date.toISOString().slice(0, 10) : String(doc.date).slice(0, 10),
    title: doc.title,
    colorKey: doc.colorKey,
  };
  if (doc.details && String(doc.details).trim()) {
    return { ...base, details: String(doc.details).trim() };
  }
  return base;
}

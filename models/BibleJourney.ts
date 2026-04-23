import mongoose, { Schema, Model, Types } from "mongoose";

export interface IReadingHistoryEntry {
  date: string;
  readings: string[];
  totalReadings: number;
}

export interface ISavedScriptureEntry {
  _id?: string;
  type: "highlight" | "bookmark";
  reference: string;
  verse?: number;
  text?: string;
  createdAt: string;
}

export interface IAIConversationEntry {
  _id?: string;
  reference: string;
  summary?: string;
  question: string;
  answer: string;
  createdAt: string;
}

export interface IChapterSummaryEntry {
  _id?: string;
  reference: string;
  summary: string;
  createdAt: string;
}

export interface IBibleJourney {
  _id: string;
  userId: Types.ObjectId;
  planType: "straight" | "mixed" | "chronological";
  catchUpMode: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  startDate: Date;
  targetDate: Date;
  otBookIdx: number;
  otChapter: number;
  ntBookIdx: number;
  ntChapter: number;
  wisdomTrack: "psalms" | "proverbs";
  wisdomChapter: number;
  straightBookIdx: number;
  straightChapter: number;
  chronologicalBookIdx: number;
  chronologicalChapter: number;
  completedChapters: number;
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate?: string;
  completedDays: string[];
  readingHistory: IReadingHistoryEntry[];
  savedScriptures: ISavedScriptureEntry[];
  aiConversations: IAIConversationEntry[];
  chapterSummaries: IChapterSummaryEntry[];
}

const BibleJourneySchema = new Schema<IBibleJourney>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    planType: { type: String, enum: ["straight", "mixed", "chronological"], default: "mixed" },
    catchUpMode: { type: Boolean, default: true },
    reminderEnabled: { type: Boolean, default: true },
    reminderTime: { type: String, default: "08:00" },
    startDate: { type: Date, required: true },
    targetDate: { type: Date, required: true },
    otBookIdx: { type: Number, default: 0 },
    otChapter: { type: Number, default: 1 },
    ntBookIdx: { type: Number, default: 0 },
    ntChapter: { type: Number, default: 1 },
    wisdomTrack: { type: String, enum: ["psalms", "proverbs"], default: "psalms" },
    wisdomChapter: { type: Number, default: 1 },
    straightBookIdx: { type: Number, default: 0 },
    straightChapter: { type: Number, default: 1 },
    chronologicalBookIdx: { type: Number, default: 0 },
    chronologicalChapter: { type: Number, default: 1 },
    completedChapters: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastCompletedDate: { type: String },
    completedDays: [{ type: String }],
    readingHistory: [
      {
        date: { type: String, required: true },
        readings: [{ type: String, required: true }],
        totalReadings: { type: Number, required: true, default: 0 },
      },
    ],
    savedScriptures: [
      {
        type: { type: String, enum: ["highlight", "bookmark"], required: true },
        reference: { type: String, required: true },
        verse: { type: Number },
        text: { type: String },
        createdAt: { type: String, required: true },
      },
    ],
    aiConversations: [
      {
        reference: { type: String, required: true },
        summary: { type: String },
        question: { type: String, required: true },
        answer: { type: String, required: true },
        createdAt: { type: String, required: true },
      },
    ],
    chapterSummaries: [
      {
        reference: { type: String, required: true },
        summary: { type: String, required: true },
        createdAt: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

BibleJourneySchema.index({ userId: 1 }, { unique: true });

// In Next.js dev HMR, Mongoose can keep an older model definition cached
// (e.g. stale enum values). Recreate this model so schema changes apply.
if (mongoose.models.BibleJourney) {
  delete mongoose.models.BibleJourney;
}

export const BibleJourney: Model<IBibleJourney> =
  mongoose.model<IBibleJourney>("BibleJourney", BibleJourneySchema);

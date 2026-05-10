import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { PasswordEntry } from "@/models/PasswordEntry";
import { decryptPassword, encryptPassword } from "@/lib/passwordCrypto";
import { isPasswordEntryCategoryKey, type PasswordEntryCategoryKey } from "@/lib/passwordEntryCategories";

function getPasswordEntryErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name?: string }).name === "ValidationError" &&
    "errors" in error
  ) {
    const errorsObj = (error as { errors?: Record<string, { message?: string }> }).errors;
    const first = errorsObj ? Object.values(errorsObj)[0] : undefined;
    if (first?.message) return first.message;
  }
  return fallback;
}

function serializePasswordEntry(doc: {
  _id: { toString(): string };
  userId: { toString(): string };
  label: string;
  username: string;
  category?: string;
  encryptedPassword: string;
  iv: string;
  authTag: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const category: PasswordEntryCategoryKey =
    typeof doc.category === "string" && isPasswordEntryCategoryKey(doc.category) ? doc.category : "email";
  return {
    _id: doc._id.toString(),
    userId: doc.userId.toString(),
    label: doc.label,
    username: doc.username,
    category,
    password: decryptPassword({
      encryptedPassword: doc.encryptedPassword,
      iv: doc.iv,
      authTag: doc.authTag,
    }),
    notes: doc.notes ?? "",
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return (session.user as { id?: string }).id ?? null;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const entries = await PasswordEntry.find({ userId }).sort({ label: 1, createdAt: -1 }).lean();
    return NextResponse.json(entries.map((entry) => serializePasswordEntry(entry)));
  } catch (error) {
    console.error("GET passwords error:", error);
    return NextResponse.json({ error: "Failed to fetch passwords" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
    let category: PasswordEntryCategoryKey = "email";
    if (typeof body?.category === "string" && isPasswordEntryCategoryKey(body.category)) {
      category = body.category;
    }

    if (!label) return NextResponse.json({ error: "label is required" }, { status: 400 });
    if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });
    if (!password) return NextResponse.json({ error: "password is required" }, { status: 400 });

    const encrypted = encryptPassword(password);

    await connectDB();
    const created = await PasswordEntry.create({
      userId,
      label,
      username,
      category,
      ...encrypted,
      notes,
    });

    return NextResponse.json(serializePasswordEntry(created.toObject()));
  } catch (error) {
    console.error("POST passwords error:", error);
    return NextResponse.json(
      { error: getPasswordEntryErrorMessage(error, "Failed to create password entry") },
      { status: 500 }
    );
  }
}

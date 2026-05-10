import mongoose from "mongoose";
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const label = typeof body?.label === "string" ? body.label.trim() : undefined;
    const username = typeof body?.username === "string" ? body.username.trim() : undefined;
    const password = typeof body?.password === "string" ? body.password : undefined;
    const notes = typeof body?.notes === "string" ? body.notes.trim() : undefined;
    const categoryRaw = body?.category;

    await connectDB();
    const entry = await PasswordEntry.findOne({ _id: id, userId });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (label !== undefined) {
      if (!label) return NextResponse.json({ error: "label cannot be empty" }, { status: 400 });
      entry.label = label;
    }
    if (username !== undefined) {
      if (!username) {
        return NextResponse.json({ error: "username cannot be empty" }, { status: 400 });
      }
      entry.username = username;
    }
    if (notes !== undefined) entry.notes = notes;
    if (categoryRaw !== undefined) {
      if (typeof categoryRaw !== "string" || !isPasswordEntryCategoryKey(categoryRaw)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      entry.category = categoryRaw;
    }
    if (password !== undefined) {
      if (!password) {
        return NextResponse.json({ error: "password cannot be empty" }, { status: 400 });
      }
      const encrypted = encryptPassword(password);
      entry.encryptedPassword = encrypted.encryptedPassword;
      entry.iv = encrypted.iv;
      entry.authTag = encrypted.authTag;
    }

    await entry.save();
    return NextResponse.json(serializePasswordEntry(entry.toObject()));
  } catch (error) {
    console.error("PUT password error:", error);
    return NextResponse.json(
      { error: getPasswordEntryErrorMessage(error, "Failed to update password entry") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectDB();
    const deleted = await PasswordEntry.findOneAndDelete({ _id: id, userId });
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE password error:", error);
    return NextResponse.json({ error: "Failed to delete password entry" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { sendFailedLoginLockoutAlert } from "@/lib/failedLoginAlert";

const MAX_FAILED_LOGIN_ATTEMPTS = 3;
const LOGIN_LOCKOUT_MS = 30 * 60 * 1000;

function lockoutMessage(remainingMs: number) {
  const remainingMins = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
  return `Too many failed attempts. Try again in ${remainingMins} minute${remainingMins === 1 ? "" : "s"}.`;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!session?.user?.email || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const password = typeof body?.password === "string" ? body.password : "";
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(userId).select("email password failedLoginAttempts lockUntil");
    if (!user?.password) {
      return NextResponse.json(
        {
          error:
            "This account has no password on file (for example, Google sign-in only). Use an account with email and password, or add a password in Settings if available.",
        },
        { status: 403 }
      );
    }

    const now = Date.now();
    if (user.lockUntil && user.lockUntil.getTime() > now) {
      return NextResponse.json(
        { error: lockoutMessage(user.lockUntil.getTime() - now) },
        { status: 429 }
      );
    }
    if (user.lockUntil && user.lockUntil.getTime() <= now) {
      await User.updateOne(
        { _id: user._id },
        { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } }
      );
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const failed = (user.failedLoginAttempts ?? 0) + 1;
      if (failed >= MAX_FAILED_LOGIN_ATTEMPTS) {
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              failedLoginAttempts: 0,
              lockUntil: new Date(now + LOGIN_LOCKOUT_MS),
            },
          }
        );
        try {
          await sendFailedLoginLockoutAlert({
            userEmail: user.email,
            reason: "password-manager-verify",
          });
        } catch (emailErr) {
          console.error("Failed to send lockout alert email:", emailErr);
        }
        return NextResponse.json(
          { error: lockoutMessage(LOGIN_LOCKOUT_MS) },
          { status: 429 }
        );
      }
      await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: failed } });
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    if ((user.failedLoginAttempts ?? 0) > 0 || user.lockUntil) {
      await User.updateOne(
        { _id: user._id },
        { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("verify-password error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

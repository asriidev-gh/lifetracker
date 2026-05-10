import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "./mongodb";
import { User } from "@/models/User";
import { sendFailedLoginLockoutAlert } from "./failedLoginAlert";

const MAX_FAILED_LOGIN_ATTEMPTS = 3;
const LOGIN_LOCKOUT_MS = 30 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const user = await User.findOne({ email: credentials.email }).select(
          "name email image password failedLoginAttempts lockUntil"
        );
        if (!user?.password) return null;
        const now = Date.now();
        if (user.lockUntil && user.lockUntil.getTime() > now) {
          return null;
        }
        if (user.lockUntil && user.lockUntil.getTime() <= now) {
          await User.updateOne(
            { _id: user._id },
            { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } }
          );
          user.failedLoginAttempts = 0;
          user.lockUntil = undefined;
        }
        const valid = await bcrypt.compare(credentials.password, user.password);
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
                reason: "credentials-signin",
              });
            } catch (emailErr) {
              console.error("Failed to send lockout alert email:", emailErr);
            }
          } else {
            await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: failed } });
          }
          return null;
        }
        if ((user.failedLoginAttempts ?? 0) > 0 || user.lockUntil) {
          await User.updateOne(
            { _id: user._id },
            { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } }
          );
        }
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        await connectDB();
        let dbUser = await User.findOne({ email: user.email });
        if (!dbUser) {
          dbUser = await User.create({
            name: user.name ?? "User",
            email: user.email,
            image: user.image,
          });
        }
        (user as { id?: string }).id = dbUser._id.toString();
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

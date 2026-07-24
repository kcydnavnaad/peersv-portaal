import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { authConfig } from "./auth.config";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  extractIpFromHeaders,
  extractUserAgent,
  logAuthEvent,
} from "@/lib/audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Wachtwoord", type: "password" },
        mfaCode: { label: "MFA code", type: "text" },
      },
      async authorize(creds) {
        const email = creds?.email as string | undefined;
        const password = creds?.password as string | undefined;
        if (!email || !password) return null;

        let ipAddress: string | null = null;
        let userAgent: string | null = null;
        try {
          const hdrs = await headers();
          ipAddress = extractIpFromHeaders(hdrs);
          userAgent = extractUserAgent(hdrs);
        } catch {
          // Outside request context or headers() failed — proceed without
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user) {
          await logAuthEvent({
            email,
            eventType: "login_fail",
            ipAddress,
            userAgent,
          });
          return null;
        }
        if (user.deactivatedAt) {
          await logAuthEvent({
            email,
            eventType: "login_fail",
            userId: user.id,
            ipAddress,
            userAgent,
          });
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await logAuthEvent({
            email,
            eventType: "login_fail",
            userId: user.id,
            ipAddress,
            userAgent,
          });
          return null;
        }

        if (user.mfaEnabled) {
          const mfaCode = (creds?.mfaCode as string | undefined)?.trim() ?? "";
          if (!mfaCode) {
            throw new Error("MFA_REQUIRED");
          }

          let mfaOk = false;
          const normalized = mfaCode.replace(/\s+/g, "");
          if (/^\d{6}$/.test(normalized) && user.mfaSecret) {
            const { verifyTotp } = await import("@/lib/mfa");
            mfaOk = verifyTotp(normalized, user.mfaSecret);
          }

          if (!mfaOk) {
            const { consumeRecoveryCode } = await import("@/lib/mfa");
            mfaOk = await consumeRecoveryCode(user.id, normalized);
          }

          if (!mfaOk) {
            await logAuthEvent({
              email,
              eventType: "login_fail_mfa",
              userId: user.id,
              ipAddress,
              userAgent,
            });
            return null;
          }
        }

        // Update last_login_at (fire-and-forget, geen reden om login te blokkeren als update faalt)
        try {
          await db
            .update(users)
            .set({ lastLoginAt: sql`NOW()` })
            .where(eq(users.id, user.id));
        } catch (err) {
          console.error("Failed to update last_login_at:", err);
        }

        await logAuthEvent({
          email: user.email,
          eventType: "login_success",
          userId: user.id,
          ipAddress,
          userAgent,
        });

        return {
          id: String(user.id),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          isAlsoTrainer: user.isAlsoTrainer,
        };
      },
    }),
  ],
});
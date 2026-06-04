import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { eq, sql } from "drizzle-orm";
import { authConfig } from "./auth.config";
import { db } from "@/db";
import { users } from "@/db/schema";

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

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user) return null;
        if (user.deactivatedAt) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

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

          if (!mfaOk) return null;
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

        return {
          id: String(user.id),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        };
      },
    }),
  ],
});
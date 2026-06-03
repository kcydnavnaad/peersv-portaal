"use server";

import bcrypt from "bcrypt";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { emailTokens, users } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import {
  flattenAuthErrors,
  forgotPasswordSchema,
  resetPasswordSchema,
  type AuthFormState,
} from "@/lib/auth-forms";
import { consumeToken, createToken, validateToken } from "@/lib/tokens";

const RATE_LIMIT_PER_HOUR = 3;

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      errors: flattenAuthErrors(parsed.error),
      values: { email: String(formData.get("email") ?? "") },
    };
  }

  const email = parsed.data.email.toLowerCase();

  // Silent on enumeration: always return success-like state.
  // We never reveal whether the email exists.

  const [user] = await db
    .select({ id: users.id, deactivatedAt: users.deactivatedAt })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // If user not found, exit silently with success message.
  if (!user || user.deactivatedAt) {
    return {
      success: true,
      message: "Als dit email bekend is, ontvang je een reset-link per email.",
    };
  }

  // Rate limit: max 3 reset tokens per user per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentTokens = await db
    .select({ id: emailTokens.id })
    .from(emailTokens)
    .where(
      and(
        eq(emailTokens.userId, user.id),
        eq(emailTokens.purpose, "password_reset"),
        gt(emailTokens.createdAt, oneHourAgo),
      ),
    );

  if (recentTokens.length >= RATE_LIMIT_PER_HOUR) {
    console.log(
      `[password-reset] rate limit hit for user ${user.id} (${recentTokens.length} recent tokens)`,
    );
    // Still respond as if email was sent. Don't leak rate limit info.
    return {
      success: true,
      message: "Als dit email bekend is, ontvang je een reset-link per email.",
    };
  }

  const token = await createToken(user.id, "password_reset");

  // Build the reset URL. In production, use the request host.
  // For now we rely on EMAIL_BASE_URL env var (set in K8s secrets).
  const baseUrl = process.env.EMAIL_BASE_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset/${token}`;

  const html = `
    <p>Hallo,</p>
    <p>Er is een verzoek ingediend om je wachtwoord te resetten voor het PeerSV Portaal.</p>
    <p>
      Klik op onderstaande link om een nieuw wachtwoord in te stellen.
      Deze link is geldig voor 1 uur.
    </p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>Als jij dit verzoek niet hebt ingediend, kun je deze mail negeren.</p>
    <p>—<br>PeerSV Portaal</p>
  `;

  await sendEmail({
    to: email,
    subject: "PeerSV Portaal — wachtwoord resetten",
    html,
  });

  return {
    success: true,
    message: "Als dit email bekend is, ontvang je een reset-link per email.",
  };
}

export async function resetPassword(
  token: string,
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      errors: flattenAuthErrors(parsed.error),
    };
  }

  const validated = await validateToken(token, "password_reset");
  if (!validated) {
    return {
      errors: {
        _form: "Token is ongeldig of verlopen. Vraag een nieuwe reset-link aan.",
      },
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, validated.userId));

  await consumeToken(validated.tokenId);

  return {
    success: true,
    message: "Wachtwoord succesvol gewijzigd. Je kan nu inloggen.",
  };
}

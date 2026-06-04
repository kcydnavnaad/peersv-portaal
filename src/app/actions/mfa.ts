"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { mfaRecoveryCodes, users } from "@/db/schema";
import { generateRecoveryCodes, verifyTotp } from "@/lib/mfa";

type FormState = {
  error?: string;
  recoveryCodes?: string[];
};

export async function enrollMfa(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Niet ingelogd." };
  }
  const userId = Number(session.user.id);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { error: "Gebruiker niet gevonden." };
  }

  if (user.mfaEnabled) {
    return { error: "MFA is al geactiveerd voor je account." };
  }

  if (!user.mfaSecret) {
    return {
      error:
        "Geen MFA secret gevonden. Vernieuw de pagina en probeer opnieuw.",
    };
  }

  const code = String(formData.get("code") ?? "");
  if (!verifyTotp(code, user.mfaSecret)) {
    return { error: "Ongeldige code. Controleer je app en probeer opnieuw." };
  }

  const { codes, hashes } = generateRecoveryCodes();

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ mfaEnabled: true, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await tx.insert(mfaRecoveryCodes).values(
      hashes.map((codeHash) => ({
        userId,
        codeHash,
      })),
    );
  });

  return { recoveryCodes: codes };
}

export async function resetMfaEnrollment(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = Number(session.user.id);

  await db
    .update(users)
    .set({ mfaSecret: null, mfaEnabled: false, updatedAt: new Date() })
    .where(eq(users.id, userId));

  redirect("/profiel/mfa/setup");
}

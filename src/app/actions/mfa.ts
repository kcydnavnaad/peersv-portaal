"use server";

import bcrypt from "bcrypt";
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

type MfaActionState = {
  ok?: boolean;
  error?: string;
  recoveryCodes?: string[];
};

export async function disableMfa(
  _prev: MfaActionState,
  formData: FormData,
): Promise<MfaActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Niet ingelogd." };
  }
  const userId = Number(session.user.id);

  const currentPassword = String(formData.get("currentPassword") ?? "");
  if (!currentPassword) {
    return { error: "Wachtwoord is verplicht." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { error: "Gebruiker niet gevonden." };
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return { error: "Wachtwoord onjuist." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        mfaEnabled: false,
        mfaSecret: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await tx
      .delete(mfaRecoveryCodes)
      .where(eq(mfaRecoveryCodes.userId, userId));
  });

  return { ok: true };
}

export async function regenerateRecoveryCodes(
  _prev: MfaActionState,
  formData: FormData,
): Promise<MfaActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Niet ingelogd." };
  }
  const userId = Number(session.user.id);

  const currentPassword = String(formData.get("currentPassword") ?? "");
  if (!currentPassword) {
    return { error: "Wachtwoord is verplicht." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { error: "Gebruiker niet gevonden." };
  }

  if (!user.mfaEnabled) {
    return { error: "MFA is niet actief voor je account." };
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return { error: "Wachtwoord onjuist." };
  }

  const { codes, hashes } = generateRecoveryCodes();

  await db.transaction(async (tx) => {
    await tx
      .delete(mfaRecoveryCodes)
      .where(eq(mfaRecoveryCodes.userId, userId));

    await tx.insert(mfaRecoveryCodes).values(
      hashes.map((codeHash) => ({
        userId,
        codeHash,
      })),
    );
  });

  return { ok: true, recoveryCodes: codes };
}

export async function adminResetMfa(
  targetUserId: number,
  _prev: MfaActionState,
  formData: FormData,
): Promise<MfaActionState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return { error: "Niet toegestaan." };
  }
  const adminId = Number(session.user.id);

  const adminPassword = String(formData.get("adminPassword") ?? "");
  if (!adminPassword) {
    return { error: "Wachtwoord is verplicht." };
  }

  const [admin] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, adminId))
    .limit(1);

  if (!admin) {
    return { error: "Admin niet gevonden." };
  }

  const ok = await bcrypt.compare(adminPassword, admin.passwordHash);
  if (!ok) {
    return { error: "Je eigen wachtwoord is onjuist." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        mfaEnabled: false,
        mfaSecret: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId));

    await tx
      .delete(mfaRecoveryCodes)
      .where(eq(mfaRecoveryCodes.userId, targetUserId));
  });

  return { ok: true };
}

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

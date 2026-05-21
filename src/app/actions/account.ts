"use server";

import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { validatePassword } from "@/lib/password";

export type ChangePasswordState = {
  error?: string;
};

export async function changeOwnPassword(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Niet ingelogd." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword) {
    return { error: "Huidig wachtwoord is verplicht." };
  }

  const validationError = validatePassword(newPassword);
  if (validationError) {
    return { error: validationError };
  }

  if (newPassword !== confirmPassword) {
    return { error: "De twee nieuwe wachtwoorden komen niet overeen." };
  }

  if (newPassword === currentPassword) {
    return { error: "Het nieuwe wachtwoord moet verschillen van het huidige." };
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

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return { error: "Huidig wachtwoord is onjuist." };
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/profiel");
  redirect("/profiel?updated=password");
}

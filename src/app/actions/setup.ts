"use server";

import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  flattenAuthErrors,
  resetPasswordSchema,
  type AuthFormState,
} from "@/lib/auth-forms";
import { consumeToken, validateToken } from "@/lib/tokens";

export async function setupPassword(
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

  const validated = await validateToken(token, "invite");
  if (!validated) {
    return {
      errors: {
        _form: "Uitnodiging is ongeldig of verlopen. Vraag aan een admin om een nieuwe te sturen.",
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
    message: "Wachtwoord ingesteld. Je kan nu inloggen.",
  };
}

"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type AuthenticateResult =
  | { ok: true }
  | { ok: false; stage: "credentials"; error: string }
  | { ok: false; stage: "mfa"; error?: string };

export async function authenticate(
  _prev: AuthenticateResult | undefined,
  formData: FormData,
): Promise<AuthenticateResult> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      mfaCode: formData.get("mfaCode") ?? "",
      redirectTo: "/dashboard",
    });

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? (error.cause as { err?: { message?: string } } | undefined)?.err
            ?.message ?? error.message
        : "";

    if (message === "MFA_REQUIRED") {
      return { ok: false, stage: "mfa" };
    }

    if (error instanceof AuthError) {
      const mfaCodeRaw = formData.get("mfaCode");
      const isMfaStage =
        mfaCodeRaw !== null && String(mfaCodeRaw).length > 0;
      switch (error.type) {
        case "CredentialsSignin":
          return isMfaStage
            ? { ok: false, stage: "mfa", error: "Ongeldige MFA-code." }
            : {
                ok: false,
                stage: "credentials",
                error: "Ongeldige inloggegevens.",
              };
        default:
          return {
            ok: false,
            stage: "credentials",
            error: "Er ging iets mis bij het inloggen.",
          };
      }
    }
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}

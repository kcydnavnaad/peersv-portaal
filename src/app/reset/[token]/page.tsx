import Link from "next/link";
import { resetPassword } from "@/app/actions/password-reset";
import { validateToken } from "@/lib/tokens";
import { ResetPasswordForm } from "./_components/reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Voor-validatie: als token al ongeldig is, toon meteen een melding.
  const valid = await validateToken(token, "password_reset");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Nieuw wachtwoord
          </h1>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {!valid ? (
            <div className="space-y-3">
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                Deze link is ongeldig of verlopen. Vraag een nieuwe reset-link aan.
              </p>
              <Link
                href="/forgot-password"
                className="block rounded-md bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
              >
                Nieuwe link aanvragen
              </Link>
            </div>
          ) : (
            <ResetPasswordForm token={token} action={resetPassword} />
          )}
        </div>

        <div className="text-center text-sm">
          <Link href="/login" className="text-slate-600 hover:underline">
            ← Terug naar inloggen
          </Link>
        </div>
      </div>
    </div>
  );
}

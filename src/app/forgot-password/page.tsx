import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/password-reset";
import { ForgotPasswordForm } from "./_components/forgot-password-form";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Wachtwoord vergeten
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Vul je email in om een reset-link te ontvangen.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <ForgotPasswordForm action={requestPasswordReset} />
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

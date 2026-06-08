import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { mfaRecoveryCodes, users } from "@/db/schema";
import { logout } from "@/app/actions/auth";
import { PasswordForm } from "./_components/PasswordForm";
import { MfaManagementButtons } from "./_components/mfa-management-buttons";

export const dynamic = "force-dynamic";

export default async function ProfielPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const sp = await searchParams;
  const justUpdated = sp.updated === "password";

  const userId = Number(session.user.id);
  const [u] = await db
    .select({ mfaEnabled: users.mfaEnabled })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const mfaEnabled = u?.mfaEnabled ?? false;

  let recoveryCodesAvailable = 0;
  if (mfaEnabled) {
    const codes = await db
      .select({ id: mfaRecoveryCodes.id })
      .from(mfaRecoveryCodes)
      .where(
        and(
          eq(mfaRecoveryCodes.userId, userId),
          isNull(mfaRecoveryCodes.usedAt),
        ),
      );
    recoveryCodesAvailable = codes.length;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profiel</h1>
        <p className="mt-1 text-sm text-slate-600">
          Beheer je accountgegevens.
        </p>
      </div>

      {justUpdated && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Wachtwoord succesvol gewijzigd.
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Account</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-md">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Naam</dt>
            <dd className="mt-1 text-sm">{session.user.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">E-mail</dt>
            <dd className="mt-1 text-sm">{session.user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Rol</dt>
            <dd className="mt-1 text-sm capitalize">{session.user.role}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Wachtwoord wijzigen</h2>
        <PasswordForm />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Tweefactor authenticatie</h2>
        {mfaEnabled ? (
          <div className="mt-3 space-y-3">
            <p className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800">
              <span className="size-2 rounded-full bg-emerald-500" />
              Actief
            </p>
            <p className="text-sm text-slate-600">
              Bij elk login vraag je portaal om een 6-cijferige code uit je
              authenticator app of een herstelcode.
            </p>
            <p className="text-sm text-slate-600">
              Je hebt nog <strong>{recoveryCodesAvailable} herstelcodes</strong>{" "}
              beschikbaar (van 10).
            </p>
            <MfaManagementButtons
              recoveryCodesAvailable={recoveryCodesAvailable}
            />
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="inline-flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
              <span className="size-2 rounded-full bg-amber-500" />
              Niet ingesteld
            </p>
            <p className="text-sm text-slate-600">
              Met tweefactor beveilig je je account met een extra code uit je
              authenticator app. Sterk aangeraden voor admins.
            </p>
            <Link
              href="/profiel/mfa/setup"
              className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Tweefactor instellen
            </Link>
          </div>
        )}
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-6">
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Uitloggen
          </button>
        </form>
      </section>
    </div>
  );
}

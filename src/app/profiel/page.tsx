import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logout } from "@/app/actions/auth";
import { PasswordForm } from "./_components/PasswordForm";

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

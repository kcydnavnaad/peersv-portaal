import Link from "next/link";
import { auth } from "@/auth";

export default async function AdminLandingPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">
          Admin overzicht
        </h1>
        <p className="mt-2 text-slate-600">
          Welkom {session?.user?.name}. Hier beheer je de hele club.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/leden"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <h2 className="text-lg font-medium">Leden</h2>
          <p className="mt-1 text-sm text-slate-600">
            Ledenadministratie beheren.
          </p>
        </Link>
        <Link
          href="/admin/teams"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <h2 className="text-lg font-medium">Teams</h2>
          <p className="mt-1 text-sm text-slate-600">
            Teams en seizoenen beheren.
          </p>
        </Link>
        <Link
          href="/admin/trainers"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <h2 className="text-lg font-medium">Trainers</h2>
          <p className="mt-1 text-sm text-slate-600">
            Tarieven, vlinder-status en IBAN beheren.
          </p>
        </Link>
        <Link
          href="/admin/prestaties"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <h2 className="text-lg font-medium">Prestaties</h2>
          <p className="mt-1 text-sm text-slate-600">
            Alle trainerprestaties bekijken en uitbetalen.
          </p>
        </Link>
      </section>
    </div>
  );
}

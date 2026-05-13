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

      <section className="grid gap-4 sm:grid-cols-3">
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
          href="/trainer"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <h2 className="text-lg font-medium">Trainersweergave</h2>
          <p className="mt-1 text-sm text-slate-600">
            Bekijk wat trainers zien.
          </p>
        </Link>
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-slate-500">
          <h2 className="text-lg font-medium">Meer modules</h2>
          <p className="mt-1 text-sm">Komen later.</p>
        </div>
      </section>
    </div>
  );
}

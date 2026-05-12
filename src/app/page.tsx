import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Welkom bij het PeerSV portaal. Beheer hier de leden van de club.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/leden"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
        >
          <h2 className="text-lg font-medium">Leden</h2>
          <p className="mt-1 text-sm text-slate-600">
            Bekijk en beheer alle clubleden.
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

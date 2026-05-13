import { auth } from "@/auth";

export default async function TrainerLandingPage() {
  const session = await auth();
  const isAdminView = session?.user?.role === "admin";

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Trainer</h1>
        <p className="mt-2 text-slate-600">
          Welkom {session?.user?.name}. Hier vind je je trainingsoverzicht.
        </p>
        {isAdminView && (
          <p className="mt-2 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">
            Je bekijkt deze pagina als admin.
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-medium">Mijn trainingen</h2>
          <p className="mt-1 text-sm text-slate-600">
            Overzicht van geplande trainingen (komt later).
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-slate-500">
          <h2 className="text-lg font-medium">Vergoedingen</h2>
          <p className="mt-1 text-sm">Komen later.</p>
        </div>
      </section>
    </div>
  );
}

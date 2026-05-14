import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { seasons, teamTrainers, teams, users } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function TrainerLandingPage() {
  const session = await auth();
  const isAdminView = session?.user?.role === "admin";
  const userId = Number(session?.user?.id);

  const [me] = Number.isFinite(userId)
    ? await db.select().from(users).where(eq(users.id, userId)).limit(1)
    : [undefined];

  const myTeams = Number.isFinite(userId)
    ? await db
        .select({
          teamId: teams.id,
          name: teams.name,
          category: teams.category,
          seasonName: seasons.name,
          isHeadTrainer: teamTrainers.isHeadTrainer,
        })
        .from(teamTrainers)
        .innerJoin(teams, eq(teamTrainers.teamId, teams.id))
        .leftJoin(seasons, eq(teams.seasonId, seasons.id))
        .where(eq(teamTrainers.userId, userId))
        .orderBy(asc(seasons.name), asc(teams.name))
    : [];

  const isButterfly = !!me?.isButterfly;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Trainer</h1>
        <p className="mt-2 text-slate-600">
          Welkom {session?.user?.name}. Hier vind je je trainingsoverzicht.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {isAdminView && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              Je bekijkt deze pagina als admin.
            </span>
          )}
          {isButterfly && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">
              <span className="font-medium">Vlinder</span>
              <span className="text-amber-700">
                Je kan voor alle teams prestaties loggen
              </span>
            </span>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">Mijn prestaties</h2>
            <p className="mt-1 text-sm text-slate-600">
              Log trainingen, wedstrijden en tornooien.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/trainer/prestaties"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              Bekijken
            </Link>
            <Link
              href="/trainer/prestaties/nieuw"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Nieuwe prestatie
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-medium">Mijn ploegen</h2>
        </header>
        {myTeams.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            Je bent nog niet aan een ploeg gekoppeld. Vraag een admin om je te
            koppelen.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {myTeams.map((t) => (
              <li
                key={t.teamId}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {t.name}
                    </span>
                    {t.isHeadTrainer && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        Hoofdtrainer
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t.category ?? "Geen categorie"} · {t.seasonName ?? "-"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

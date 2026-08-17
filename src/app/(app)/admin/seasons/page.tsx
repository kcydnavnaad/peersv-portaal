import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { seasons, teams } from "@/db/schema";
import { CreateSeasonForm } from "./_components/create-season-form";
import { SeasonsList } from "./_components/seasons-list";

export const dynamic = "force-dynamic";

export default async function SeasonsPage() {
  const rows = await db
    .select({
      id: seasons.id,
      name: seasons.name,
      startDate: seasons.startDate,
      endDate: seasons.endDate,
      isActive: seasons.isActive,
      teamCount: sql<number>`COUNT(${teams.id})::int`,
    })
    .from(seasons)
    .leftJoin(teams, eq(teams.seasonId, seasons.id))
    .groupBy(seasons.id)
    .orderBy(desc(seasons.startDate));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Seizoenen</h1>
        <p className="mt-1 text-sm text-slate-600">
          Beheer seizoenen en clone teams naar een nieuw seizoen.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Nieuw seizoen aanmaken</h2>
        <p className="mt-1 text-sm text-slate-600">
          Bv. &quot;2026-2027&quot; met startdatum 1 juli 2026 en einddatum 30
          juni 2027.
        </p>
        <div className="mt-4">
          <CreateSeasonForm />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Bestaande seizoenen</h2>
        <p className="mt-1 text-sm text-slate-600">
          Activeer een seizoen om het standaard te tonen. Clone teams om snel te
          beginnen.
        </p>
        <div className="mt-4">
          <SeasonsList seasons={rows} />
        </div>
      </section>
    </div>
  );
}

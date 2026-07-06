import Link from "next/link";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/db";
import { seasons, teamTrainers, teams } from "@/db/schema";
import { TeamRow } from "./_components/team-row";

export const dynamic = "force-dynamic";

type SeasonFilter = "active" | "all";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const sp = await searchParams;
  const seasonFilter: SeasonFilter = sp.season === "all" ? "all" : "active";

  const conditions: SQL[] = [];
  if (seasonFilter === "active") {
    conditions.push(eq(seasons.isActive, true));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      category: teams.category,
      seasonId: teams.seasonId,
      seasonName: seasons.name,
      trainerCount: sql<number>`count(${teamTrainers.id})::int`,
    })
    .from(teams)
    .leftJoin(seasons, eq(teams.seasonId, seasons.id))
    .leftJoin(teamTrainers, eq(teamTrainers.teamId, teams.id))
    .where(whereClause)
    .groupBy(teams.id, seasons.name)
    .orderBy(desc(seasons.name), asc(teams.name));

  const labelMap: Record<SeasonFilter, string> = {
    active: "actief seizoen",
    all: "alle seizoenen",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Teams</h1>
          <p className="mt-1 text-sm text-slate-600">
            {rows.length} {rows.length === 1 ? "team" : "teams"} ({labelMap[seasonFilter]}).
          </p>
        </div>
        <Link
          href="/admin/teams/nieuw"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Nieuw team
        </Link>
      </div>

      <div className="flex gap-2 text-sm">
        <Link
          href="/admin/teams"
          className={`rounded-md px-3 py-1.5 ${
            seasonFilter === "active"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          Actief seizoen
        </Link>
        <Link
          href="/admin/teams?season=all"
          className={`rounded-md px-3 py-1.5 ${
            seasonFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          Alle seizoenen
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Nog geen teams. Klik op{" "}
          <span className="font-medium text-slate-700">Nieuw team</span> om er
          eentje toe te voegen.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">Categorie</th>
                <th className="px-4 py-3">Seizoen</th>
                <th className="px-4 py-3 text-right">Trainers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((t) => (
                <TeamRow key={t.id} id={t.id}>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {t.category ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {t.seasonName ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {t.trainerCount}
                  </td>
                </TeamRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

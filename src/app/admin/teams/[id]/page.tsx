import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { seasons, teamTrainers, teams } from "@/db/schema";
import { DeleteTeamButton } from "../_components/delete-team-button";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isFinite(teamId)) notFound();

  const [team] = await db
    .select({
      id: teams.id,
      name: teams.name,
      category: teams.category,
      seasonId: teams.seasonId,
      seasonName: seasons.name,
      createdAt: teams.createdAt,
      trainerCount: sql<number>`count(${teamTrainers.id})::int`,
    })
    .from(teams)
    .leftJoin(seasons, eq(teams.seasonId, seasons.id))
    .leftJoin(teamTrainers, eq(teamTrainers.teamId, teams.id))
    .where(eq(teams.id, teamId))
    .groupBy(teams.id, seasons.name)
    .limit(1);

  if (!team) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/teams"
            className="text-sm text-slate-500 hover:underline"
          >
            ← Terug naar teams
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {team.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Seizoen {team.seasonName ?? "-"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/teams/${team.id}/bewerken`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Bewerken
          </Link>
          <DeleteTeamButton id={team.id} label={team.name} />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <dl className="divide-y divide-slate-100 text-sm">
          <Row label="Naam" value={team.name} />
          <Row label="Categorie" value={team.category ?? "-"} />
          <Row label="Seizoen" value={team.seasonName ?? "-"} />
          <Row label="Aantal trainers" value={team.trainerCount} />
          <Row
            label="Aangemaakt"
            value={team.createdAt.toLocaleString("nl-BE")}
          />
        </dl>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 px-4 py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 text-slate-900">{value}</dd>
    </div>
  );
}

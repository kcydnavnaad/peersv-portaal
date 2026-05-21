import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import {
  toggleHeadTrainer,
  toggleTeamTrainer,
} from "@/app/actions/team-trainers";
import { db } from "@/db";
import { seasons, teamTrainers, teams, users } from "@/db/schema";
import { DeleteTeamButton } from "../_components/delete-team-button";
import { TrainerToggle } from "../_components/trainer-toggle";

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

  const trainerRows = await db
    .select({
      userId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      isButterfly: users.isButterfly,
      deactivatedAt: users.deactivatedAt,
      linkId: teamTrainers.id,
      isHeadTrainer: teamTrainers.isHeadTrainer,
    })
    .from(users)
    .leftJoin(
      teamTrainers,
      and(
        eq(teamTrainers.userId, users.id),
        eq(teamTrainers.teamId, teamId),
      ),
    )
    .where(
      and(
        eq(users.role, "trainer"),
        or(isNull(users.deactivatedAt), isNotNull(teamTrainers.id)),
      ),
    )
    .orderBy(asc(users.lastName), asc(users.firstName));

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

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-medium">Trainers</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Vink aan om een trainer aan dit team te koppelen.
          </p>
        </header>
        {trainerRows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            Nog geen trainers in het systeem.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {trainerRows.map((t) => {
              const linked = t.linkId !== null;
              const isDeactivated = t.deactivatedAt !== null;
              return (
                <li
                  key={t.userId}
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${
                    isDeactivated ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TrainerToggle
                      teamId={team.id}
                      userId={t.userId}
                      checked={linked}
                      action={toggleTeamTrainer}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">
                          {t.firstName} {t.lastName}
                        </span>
                        {t.isButterfly && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                            Vlinder
                          </span>
                        )}
                        {isDeactivated && (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                            Gedeactiveerd
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {t.email ?? "-"}
                      </div>
                    </div>
                  </div>
                  <TrainerToggle
                    teamId={team.id}
                    userId={t.userId}
                    checked={!!t.isHeadTrainer}
                    disabled={!linked}
                    label="Hoofdtrainer"
                    action={toggleHeadTrainer}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
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

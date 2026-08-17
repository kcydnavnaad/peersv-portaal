import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { updateTeam } from "@/app/actions/teams";
import { db } from "@/db";
import { seasons, teams } from "@/db/schema";
import { TeamForm } from "../../_components/team-form";

export const dynamic = "force-dynamic";

export default async function EditTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isFinite(teamId)) notFound();

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) notFound();

  const seasonRows = await db
    .select({
      id: seasons.id,
      name: seasons.name,
      isActive: seasons.isActive,
    })
    .from(seasons)
    .orderBy(desc(seasons.startDate));

  const boundAction = updateTeam.bind(null, team.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/teams/${team.id}`}
          className="text-sm text-slate-500 hover:underline"
        >
          ← Terug naar {team.name}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Team bewerken
        </h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <TeamForm
          action={boundAction}
          seasons={seasonRows}
          defaults={{
            name: team.name,
            category: team.category,
            seasonId: team.seasonId,
          }}
          submitLabel="Opslaan"
          cancelHref={`/admin/teams/${team.id}`}
        />
      </div>
    </div>
  );
}

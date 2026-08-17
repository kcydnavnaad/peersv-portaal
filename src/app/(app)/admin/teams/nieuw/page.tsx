import Link from "next/link";
import { desc } from "drizzle-orm";
import { createTeam } from "@/app/actions/teams";
import { db } from "@/db";
import { seasons } from "@/db/schema";
import { TeamForm } from "../_components/team-form";

export const dynamic = "force-dynamic";

export default async function NewTeamPage() {
  const seasonRows = await db
    .select({
      id: seasons.id,
      name: seasons.name,
      isActive: seasons.isActive,
    })
    .from(seasons)
    .orderBy(desc(seasons.startDate));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/teams"
          className="text-sm text-slate-500 hover:underline"
        >
          ← Terug naar teams
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Nieuw team
        </h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <TeamForm
          action={createTeam}
          seasons={seasonRows}
          submitLabel="Toevoegen"
          cancelHref="/admin/teams"
        />
      </div>
    </div>
  );
}

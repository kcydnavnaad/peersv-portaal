import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { updateMember } from "@/app/actions/members";
import { db } from "@/db";
import { members, seasons, teamMembers, teams } from "@/db/schema";
import { MemberForm } from "../../_components/member-form";
import { MemberTeamsSection } from "../../_components/member-teams-section";

export const dynamic = "force-dynamic";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isFinite(memberId)) notFound();

  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!member) notFound();

  const activeTeamRows = await db
    .select({
      teamMemberId: teamMembers.id,
      teamId: teams.id,
      teamName: teams.name,
      seasonName: seasons.name,
      joinedAt: teamMembers.joinedAt,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .leftJoin(seasons, eq(teams.seasonId, seasons.id))
    .where(
      and(
        eq(teamMembers.memberId, member.id),
        isNull(teamMembers.leftAt),
      ),
    )
    .orderBy(asc(teams.name));

  const activeTeamIds = activeTeamRows.map((t) => t.teamId);

  const availableTeamRows = await db
    .select({
      id: teams.id,
      name: teams.name,
      seasonName: seasons.name,
    })
    .from(teams)
    .leftJoin(seasons, eq(teams.seasonId, seasons.id))
    .where(
      activeTeamIds.length > 0
        ? sql`${teams.id} NOT IN ${activeTeamIds}`
        : sql`TRUE`,
    )
    .orderBy(asc(teams.name));

  const boundAction = updateMember.bind(null, member.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/leden/${member.id}`}
          className="text-sm text-slate-500 hover:underline"
        >
          ← Terug naar {member.firstName} {member.lastName}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Lid bewerken
        </h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <MemberForm
          action={boundAction}
          defaults={{
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            phone: member.phone,
            birthDate: member.birthDate,
            status: member.status,
          }}
          submitLabel="Opslaan"
          cancelHref={`/leden/${member.id}`}
        />
      </div>

      <MemberTeamsSection
        memberId={member.id}
        activeTeams={activeTeamRows}
        availableTeams={availableTeamRows}
      />
    </div>
  );
}

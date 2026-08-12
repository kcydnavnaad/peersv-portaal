import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  activityTypes,
  attendances,
  members,
  performances,
  seasons,
  teamMembers,
  teams,
} from "@/db/schema";
import { DeleteMemberButton } from "../_components/delete-member-button";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  active: "Actief",
  inactive: "Inactief",
  pending: "In aanvraag",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("nl-BE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function MemberDetailPage({
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
      teamName: teams.name,
      seasonName: seasons.name,
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

  const teamsDisplay =
    activeTeamRows.length === 0
      ? "-"
      : activeTeamRows.map((t) => t.teamName).join(", ");

  // Laatste 20 aanwezigheden voor dit lid (over alle teams)
  const attendanceHistory = await db
    .select({
      attendanceId: attendances.id,
      performanceId: performances.id,
      performanceDate: performances.performanceDate,
      activityTypeName: activityTypes.name,
      teamName: teams.name,
      present: attendances.present,
    })
    .from(attendances)
    .innerJoin(performances, eq(attendances.performanceId, performances.id))
    .leftJoin(teams, eq(performances.teamId, teams.id))
    .leftJoin(activityTypes, eq(activityTypes.id, performances.activityTypeId))
    .where(eq(attendances.memberId, member.id))
    .orderBy(desc(performances.performanceDate))
    .limit(20);

  const presentCount = attendanceHistory.filter((a) => a.present).length;
  const absentCount = attendanceHistory.filter((a) => !a.present).length;
  const total = attendanceHistory.length;
  const presentRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  const fullName = `${member.firstName} ${member.lastName}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/leden"
            className="text-sm text-slate-500 hover:underline"
          >
            ← Terug naar leden
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {fullName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Lid sinds {formatDate(member.joinedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/leden/${member.id}/bewerken`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Bewerken
          </Link>
          <DeleteMemberButton id={member.id} label={fullName} />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <dl className="divide-y divide-slate-100 text-sm">
          <Row label="Voornaam" value={member.firstName} />
          <Row label="Achternaam" value={member.lastName} />
          <Row label="E-mail" value={member.email ?? "-"} />
          <Row label="Telefoon" value={member.phone ?? "-"} />
          <Row label="Geboortedatum" value={formatDate(member.birthDate)} />
          <Row label="Ploeg" value={teamsDisplay} />
          <Row
            label="Status"
            value={
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {statusLabel[member.status] ?? member.status}
              </span>
            }
          />
          <Row label="Aangemaakt" value={member.createdAt.toLocaleString("nl-BE")} />
          <Row label="Bijgewerkt" value={member.updatedAt.toLocaleString("nl-BE")} />
        </dl>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-medium">Aanwezigheden</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {total === 0
              ? "Nog geen aanwezigheden geregistreerd."
              : `Laatste ${total}: ${presentCount} aanwezig, ${absentCount} afwezig (${presentRate}%).`}
          </p>
        </header>
        {total > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Ploeg</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceHistory.map((a) => (
                  <tr key={a.attendanceId}>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(a.performanceDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.activityTypeName ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {a.teamName ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {a.present ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                          Aanwezig
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-800">
                          Afwezig
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    <div className="grid grid-cols-1 gap-1 px-4 py-3 md:grid-cols-3 md:gap-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900 md:col-span-2">{value}</dd>
    </div>
  );
}

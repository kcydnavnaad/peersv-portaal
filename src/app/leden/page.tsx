import Link from "next/link";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { members, teamMembers, teams } from "@/db/schema";
import { MemberRow } from "./_components/member-row";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  active: "Actief",
  inactive: "Inactief",
  pending: "In aanvraag",
};

export default async function LedenPage() {
  const rows = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      email: members.email,
      status: members.status,
      createdAt: members.createdAt,
      teamNames: sql<string | null>`string_agg(${teams.name}, ', ' ORDER BY ${teams.name})`,
    })
    .from(members)
    .leftJoin(
      teamMembers,
      and(
        eq(teamMembers.memberId, members.id),
        isNull(teamMembers.leftAt),
      ),
    )
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .groupBy(members.id)
    .orderBy(desc(members.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Leden</h1>
          <p className="mt-1 text-sm text-slate-600">
            {rows.length} {rows.length === 1 ? "lid" : "leden"} geregistreerd.
          </p>
        </div>
        <Link
          href="/leden/nieuw"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Nieuw lid
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Nog geen leden. Klik op{" "}
          <span className="font-medium text-slate-700">Nieuw lid</span> om er
          eentje toe te voegen.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Ploeg</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((m) => (
                <MemberRow key={m.id} id={m.id}>
                  <td className="px-4 py-3 font-medium">
                    {m.firstName} {m.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.email ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{m.teamNames ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {statusLabel[m.status] ?? m.status}
                    </span>
                  </td>
                </MemberRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

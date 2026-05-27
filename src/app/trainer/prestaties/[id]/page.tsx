import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { attendances, members, performances, seasons, teamMembers, teams } from "@/db/schema";
import {
  formatAmount,
  performanceStatusLabel,
  performanceTypeLabel,
} from "@/lib/performances";
import { DeletePerformanceButton } from "../_components/delete-performance-button";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("nl-BE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function PerformanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfId = Number(id);
  if (!Number.isFinite(perfId)) notFound();

  const session = await auth();
  const userId = Number(session?.user?.id);

  const [perf] = await db
    .select({
      id: performances.id,
      userId: performances.userId,
      type: performances.type,
      performanceDate: performances.performanceDate,
      amount: performances.amount,
      notes: performances.notes,
      status: performances.status,
      paidAt: performances.paidAt,
      createdAt: performances.createdAt,
      updatedAt: performances.updatedAt,
      teamName: teams.name,
      seasonName: seasons.name,
    })
    .from(performances)
    .leftJoin(teams, eq(performances.teamId, teams.id))
    .leftJoin(seasons, eq(teams.seasonId, seasons.id))
    .where(eq(performances.id, perfId))
    .limit(1);

  if (!perf) notFound();
  if (Number.isFinite(userId) && perf.userId !== userId) notFound();

  // Haal performance teamId apart op (zat niet in de eerste select)
  const [perfTeam] = await db
    .select({ teamId: performances.teamId })
    .from(performances)
    .where(eq(performances.id, perfId))
    .limit(1);

  // Actieve leden in dit team + hun aanwezigheid voor deze prestatie
  const attendanceRows = perfTeam
    ? await db
        .select({
          memberId: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          present: attendances.present,
        })
        .from(teamMembers)
        .innerJoin(members, eq(teamMembers.memberId, members.id))
        .leftJoin(
          attendances,
          and(
            eq(attendances.memberId, members.id),
            eq(attendances.performanceId, perfId),
          ),
        )
        .where(
          and(
            eq(teamMembers.teamId, perfTeam.teamId),
            isNull(teamMembers.leftAt),
          ),
        )
        .orderBy(asc(members.lastName), asc(members.firstName))
    : [];

  const hasAnyAttendance = attendanceRows.some((r) => r.present !== null);
  const presentCount = attendanceRows.filter((r) => r.present === true).length;
  const absentCount = attendanceRows.filter((r) => r.present === false).length;
  const unknownCount = attendanceRows.filter((r) => r.present === null).length;

  const isOpen = perf.status === "open";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/trainer/prestaties"
            className="text-sm text-slate-500 hover:underline"
          >
            ← Terug naar prestaties
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {performanceTypeLabel[perf.type]} ·{" "}
            {formatDate(perf.performanceDate)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {perf.teamName ?? "-"}
            {perf.seasonName ? ` · ${perf.seasonName}` : ""}
          </p>
        </div>
        {isOpen && (
          <div className="flex gap-2">
            <Link
              href={`/trainer/prestaties/${perf.id}/bewerken`}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Bewerken
            </Link>
            <DeletePerformanceButton id={perf.id} />
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <dl className="divide-y divide-slate-100 text-sm">
          <Row label="Datum" value={formatDate(perf.performanceDate)} />
          <Row label="Type" value={performanceTypeLabel[perf.type]} />
          <Row label="Ploeg" value={perf.teamName ?? "-"} />
          <Row label="Bedrag" value={formatAmount(perf.amount)} />
          <Row
            label="Status"
            value={
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  perf.status === "paid"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {performanceStatusLabel[perf.status]}
              </span>
            }
          />
          {perf.paidAt && (
            <Row
              label="Betaald op"
              value={perf.paidAt.toLocaleString("nl-BE")}
            />
          )}
          <Row label="Notities" value={perf.notes ?? "-"} />
          <Row
            label="Aangemaakt"
            value={perf.createdAt.toLocaleString("nl-BE")}
          />
          <Row
            label="Bijgewerkt"
            value={perf.updatedAt.toLocaleString("nl-BE")}
          />
        </dl>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-lg font-medium">Aanwezigheden</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {!hasAnyAttendance
                ? "Nog niet ingevuld."
                : `${presentCount} aanwezig, ${absentCount} afwezig${unknownCount > 0 ? `, ${unknownCount} onbekend` : ""}.`}
            </p>
          </div>
          {isOpen && (
            <Link
              href={`/trainer/prestaties/${perf.id}/aanwezigheden`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            >
              {hasAnyAttendance ? "Bewerken" : "Invullen"}
            </Link>
          )}
        </header>
        {attendanceRows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            Geen actieve leden in deze ploeg.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {attendanceRows.map((r) => (
              <li
                key={r.memberId}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <span className="text-sm font-medium text-slate-900">
                  {r.firstName} {r.lastName}
                </span>
                {r.present === true ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                    Aanwezig
                  </span>
                ) : r.present === false ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-800">
                    Afwezig
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    Onbekend
                  </span>
                )}
              </li>
            ))}
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
    <div className="grid grid-cols-1 gap-1 px-4 py-3 md:grid-cols-3 md:gap-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900 md:col-span-2">{value}</dd>
    </div>
  );
}

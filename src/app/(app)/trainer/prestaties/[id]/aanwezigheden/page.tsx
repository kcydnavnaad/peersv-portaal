import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import {
  saveAttendances,
  skipAttendances,
} from "@/app/actions/attendances";
import { db } from "@/db";
import {
  attendances,
  members,
  performances,
  teamMembers,
  teams,
} from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AttendancesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const performanceId = Number(id);
  if (!Number.isFinite(performanceId)) notFound();

  // Fetch performance + team
  const [perf] = await db
    .select({
      id: performances.id,
      userId: performances.userId,
      teamId: performances.teamId,
      teamName: teams.name,
      performanceDate: performances.performanceDate,
    })
    .from(performances)
    .leftJoin(teams, eq(performances.teamId, teams.id))
    .where(eq(performances.id, performanceId))
    .limit(1);

  if (!perf) notFound();

  // Trainer check
  if (
    (session.user.role === "trainer" || session.user.isAlsoTrainer === true) &&
    perf.userId !== Number(session.user.id)
  ) {
    redirect("/trainer/prestaties");
  }

  // Prestaties zonder ploeg (bv. Peersv woensdagt) hebben geen aanwezigheden.
  if (perf.teamId == null) {
    redirect(`/trainer/prestaties/${performanceId}`);
  }
  const perfTeamId = perf.teamId;

  // Active team members for this team
  const memberRows = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
    })
    .from(teamMembers)
    .innerJoin(members, eq(teamMembers.memberId, members.id))
    .where(
      and(
        eq(teamMembers.teamId, perfTeamId),
        isNull(teamMembers.leftAt),
      ),
    )
    .orderBy(asc(members.lastName), asc(members.firstName));

  // Existing attendances for this performance
  const existingAttendances = await db
    .select({
      memberId: attendances.memberId,
      present: attendances.present,
    })
    .from(attendances)
    .where(eq(attendances.performanceId, performanceId));

  const attendanceMap = new Map<number, boolean>();
  for (const a of existingAttendances) {
    attendanceMap.set(a.memberId, a.present);
  }

  // Server action wrapper for the form
  async function handleSubmit(formData: FormData) {
    "use server";
    const presentIds: number[] = [];
    const absentIds: number[] = [];
    for (const m of memberRows) {
      const checked = formData.get(`member-${m.id}`);
      if (checked === "on") {
        presentIds.push(m.id);
      } else {
        absentIds.push(m.id);
      }
    }
    await saveAttendances(performanceId, presentIds, absentIds);
  }

  async function handleSkip() {
    "use server";
    await skipAttendances(performanceId);
  }

  const dateLabel = new Date(perf.performanceDate).toLocaleDateString("nl-BE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/trainer/prestaties/${performanceId}`}
          className="text-sm text-slate-500 hover:underline"
        >
          ← Terug naar prestatie
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Aanwezigheden
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {perf.teamName ?? "-"} · {dateLabel}
        </p>
      </div>

      {memberRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">
            Er zijn geen actieve leden in dit team. Voeg eerst leden toe via de
            teampagina.
          </p>
          <form action={handleSkip} className="mt-4">
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Terug naar prestatie
            </button>
          </form>
        </div>
      ) : (
        <form action={handleSubmit} className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-500">
                Vink aan welke leden aanwezig waren. Default is iedereen
                aangevinkt.
              </p>
            </header>
            <ul className="divide-y divide-slate-100">
              {memberRows.map((m) => {
                const checked = attendanceMap.has(m.id)
                  ? attendanceMap.get(m.id)
                  : true; // default: present
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      id={`member-${m.id}`}
                      name={`member-${m.id}`}
                      defaultChecked={checked}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <label
                      htmlFor={`member-${m.id}`}
                      className="cursor-pointer text-sm font-medium text-slate-900"
                    >
                      {m.firstName} {m.lastName}
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="submit"
              formAction={handleSkip}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Overslaan
            </button>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Opslaan
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { updatePerformance } from "@/app/actions/performances";
import { auth } from "@/auth";
import { db } from "@/db";
import { activityTypes, performances, users } from "@/db/schema";
import { getTeamOptionsForTrainer } from "@/lib/trainer-teams";
import { PerformanceForm } from "../../_components/performance-form";

export const dynamic = "force-dynamic";

export default async function EditPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfId = Number(id);
  if (!Number.isFinite(perfId)) notFound();

  const session = await auth();
  const isTrainer =
    session?.user?.role === "trainer" ||
    session?.user?.isAlsoTrainer === true;
  if (!isTrainer) redirect("/dashboard");
  const userId = Number(session.user.id);

  const [perf] = await db
    .select()
    .from(performances)
    .where(eq(performances.id, perfId))
    .limit(1);
  if (!perf) notFound();
  if (perf.userId !== userId) notFound();
  if (perf.status !== "open") {
    redirect(`/trainer/prestaties/${perf.id}`);
  }

  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me) redirect("/dashboard");

  const teamOptions = await getTeamOptionsForTrainer(userId, me.isButterfly);
  const activityOptions = await db
    .select({
      id: activityTypes.id,
      name: activityTypes.name,
      isDefault: activityTypes.isDefault,
    })
    .from(activityTypes)
    .orderBy(asc(activityTypes.id));
  const boundAction = updatePerformance.bind(null, perf.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/trainer/prestaties/${perf.id}`}
          className="text-sm text-slate-500 hover:underline"
        >
          ← Terug naar prestatie
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Prestatie bewerken
        </h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <PerformanceForm
          action={boundAction}
          teamOptions={teamOptions}
          activityTypes={activityOptions}
          rate={me.trainerRate}
          defaults={{
            activityTypeId: perf.activityTypeId,
            performanceDate: perf.performanceDate,
            team: perf.teamId,
            notes: perf.notes,
          }}
          submitLabel="Opslaan"
          cancelHref={`/trainer/prestaties/${perf.id}`}
        />
      </div>
    </div>
  );
}

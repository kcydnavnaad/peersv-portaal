import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { createPerformance } from "@/app/actions/performances";
import { auth } from "@/auth";
import { db } from "@/db";
import { activityTypes, users } from "@/db/schema";
import { getTeamOptionsForTrainer } from "@/lib/trainer-teams";
import { PerformanceForm } from "../_components/performance-form";

export const dynamic = "force-dynamic";

export default async function NewPerformancePage() {
  const session = await auth();
  const isTrainer =
    session?.user?.role === "trainer" ||
    session?.user?.isAlsoTrainer === true;
  if (!isTrainer) {
    redirect("/dashboard");
  }

  const userId = Number(session.user.id);
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
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/trainer/prestaties"
          className="text-sm text-slate-500 hover:underline"
        >
          ← Terug naar prestaties
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Nieuwe prestatie
        </h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <PerformanceForm
          action={createPerformance}
          teamOptions={teamOptions}
          activityTypes={activityOptions}
          rate={me.trainerRate}
          defaults={{ performanceDate: todayIso }}
          submitLabel="Toevoegen"
          cancelHref="/trainer/prestaties"
        />
      </div>
    </div>
  );
}

"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { performances, teamTrainers, teams, users } from "@/db/schema";
import {
  flattenZodErrors,
  parsePerformanceForm,
  valuesFromFormData,
  type PerformanceFormState,
} from "@/lib/performances";

async function requireTrainer() {
  const session = await auth();
  if (session?.user?.role !== "trainer") {
    throw new Error("Forbidden");
  }
  const userId = Number(session.user.id);
  if (!Number.isFinite(userId)) {
    throw new Error("Invalid session");
  }
  return { userId };
}

async function loadTrainer(userId: number) {
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me) throw new Error("User not found");
  return me;
}

async function ensureTeamAllowed(
  userId: number,
  teamId: number,
  isButterfly: boolean,
): Promise<PerformanceFormState | null> {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team) {
    return { errors: { team: "Ploeg bestaat niet" } };
  }
  if (isButterfly) return null;
  const [link] = await db
    .select()
    .from(teamTrainers)
    .where(
      and(eq(teamTrainers.userId, userId), eq(teamTrainers.teamId, teamId)),
    )
    .limit(1);
  if (!link) {
    return {
      errors: { team: "Je bent niet gekoppeld aan deze ploeg" },
    };
  }
  return null;
}

export async function createPerformance(
  _prev: PerformanceFormState,
  formData: FormData,
): Promise<PerformanceFormState> {
  const { userId } = await requireTrainer();
  const me = await loadTrainer(userId);

  const parsed = parsePerformanceForm(formData);
  if (!parsed.success) {
    return {
      errors: flattenZodErrors(parsed.error),
      values: valuesFromFormData(formData),
    };
  }

  if (!me.trainerRate) {
    return {
      errors: {
        type: "Geen tarief ingesteld op je profiel. Vraag een admin om dit in te stellen.",
      },
      values: valuesFromFormData(formData),
    };
  }

  const teamCheck = await ensureTeamAllowed(
    userId,
    parsed.data.team,
    me.isButterfly,
  );
  if (teamCheck) {
    return { ...teamCheck, values: valuesFromFormData(formData) };
  }

  await db.insert(performances).values({
    userId,
    teamId: parsed.data.team,
    type: parsed.data.type,
    performanceDate: parsed.data.performanceDate,
    amount: me.trainerRate,
    notes: parsed.data.notes,
  });

  revalidatePath("/trainer/prestaties");
  revalidatePath("/trainer");
  redirect("/trainer/prestaties");
}

export async function updatePerformance(
  id: number,
  _prev: PerformanceFormState,
  formData: FormData,
): Promise<PerformanceFormState> {
  const { userId } = await requireTrainer();
  const me = await loadTrainer(userId);

  const [existing] = await db
    .select()
    .from(performances)
    .where(eq(performances.id, id))
    .limit(1);
  if (!existing) throw new Error("Not found");
  if (existing.userId !== userId) throw new Error("Forbidden");
  if (existing.status !== "open") {
    return {
      message: "Een betaalde prestatie kan je niet bewerken.",
      values: valuesFromFormData(formData),
    };
  }

  const parsed = parsePerformanceForm(formData);
  if (!parsed.success) {
    return {
      errors: flattenZodErrors(parsed.error),
      values: valuesFromFormData(formData),
    };
  }

  const teamCheck = await ensureTeamAllowed(
    userId,
    parsed.data.team,
    me.isButterfly,
  );
  if (teamCheck) {
    return { ...teamCheck, values: valuesFromFormData(formData) };
  }

  await db
    .update(performances)
    .set({
      type: parsed.data.type,
      performanceDate: parsed.data.performanceDate,
      teamId: parsed.data.team,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(performances.id, id));

  revalidatePath("/trainer/prestaties");
  revalidatePath(`/trainer/prestaties/${id}`);
  redirect(`/trainer/prestaties/${id}`);
}

export async function deletePerformance(id: number) {
  const { userId } = await requireTrainer();

  const [existing] = await db
    .select()
    .from(performances)
    .where(eq(performances.id, id))
    .limit(1);
  if (!existing) throw new Error("Not found");
  if (existing.userId !== userId) throw new Error("Forbidden");
  if (existing.status !== "open") {
    throw new Error("Een betaalde prestatie kan je niet verwijderen.");
  }

  await db.delete(performances).where(eq(performances.id, id));

  revalidatePath("/trainer/prestaties");
  revalidatePath("/trainer");
  redirect("/trainer/prestaties");
}

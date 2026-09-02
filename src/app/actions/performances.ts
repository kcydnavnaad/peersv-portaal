"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import {
  activityTypes,
  performances,
  teamTrainers,
  teams,
  users,
} from "@/db/schema";
import { logAuthEvent } from "@/lib/audit";
import {
  flattenZodErrors,
  parsePerformanceForm,
  valuesFromFormData,
  type PerformanceFormState,
} from "@/lib/performances";
import { resolveTrainerRate } from "@/lib/trainer-rates";

async function requireTrainer() {
  const session = await auth();
  const isTrainer =
    session?.user?.role === "trainer" ||
    session?.user?.isAlsoTrainer === true;
  if (!isTrainer) {
    throw new Error("Forbidden");
  }
  const userId = Number(session.user.id);
  if (!Number.isFinite(userId)) {
    throw new Error("Invalid session");
  }
  return { userId };
}

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
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

  const [activity] = await db
    .select({ requiresTeam: activityTypes.requiresTeam })
    .from(activityTypes)
    .where(eq(activityTypes.id, parsed.data.activityTypeId))
    .limit(1);
  if (!activity) {
    return {
      errors: { activityTypeId: "Ongeldig type." },
      values: valuesFromFormData(formData),
    };
  }

  const rate = await resolveTrainerRate(userId, parsed.data.activityTypeId);
  if (!rate) {
    return {
      errors: {
        activityTypeId:
          "Geen tarief ingesteld voor deze activiteit. Vraag een admin om dit in te stellen.",
      },
      values: valuesFromFormData(formData),
    };
  }

  let teamId: number | null = null;
  if (activity.requiresTeam) {
    if (parsed.data.team == null) {
      return {
        errors: { team: "Ploeg is verplicht" },
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
    teamId = parsed.data.team;
  }

  const [created] = await db
    .insert(performances)
    .values({
      userId,
      teamId,
      activityTypeId: parsed.data.activityTypeId,
      performanceDate: parsed.data.performanceDate,
      amount: rate,
      notes: parsed.data.notes,
    })
    .returning({ id: performances.id });

  revalidatePath("/trainer/prestaties");
  revalidatePath("/trainer");
  redirect(`/trainer/prestaties/${created.id}/aanwezigheden`);
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

  const [activity] = await db
    .select({ requiresTeam: activityTypes.requiresTeam })
    .from(activityTypes)
    .where(eq(activityTypes.id, parsed.data.activityTypeId))
    .limit(1);
  if (!activity) {
    return {
      errors: { activityTypeId: "Ongeldig type." },
      values: valuesFromFormData(formData),
    };
  }

  const rate = await resolveTrainerRate(userId, parsed.data.activityTypeId);
  if (!rate) {
    return {
      errors: {
        activityTypeId:
          "Geen tarief ingesteld voor deze activiteit. Vraag een admin om dit in te stellen.",
      },
      values: valuesFromFormData(formData),
    };
  }

  let teamId: number | null = null;
  if (activity.requiresTeam) {
    if (parsed.data.team == null) {
      return {
        errors: { team: "Ploeg is verplicht" },
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
    teamId = parsed.data.team;
  }

  await db
    .update(performances)
    .set({
      activityTypeId: parsed.data.activityTypeId,
      performanceDate: parsed.data.performanceDate,
      teamId,
      notes: parsed.data.notes,
      amount: rate,
      updatedAt: new Date(),
    })
    .where(eq(performances.id, id));

  revalidatePath("/trainer/prestaties");
  revalidatePath(`/trainer/prestaties/${id}`);
  redirect(`/trainer/prestaties/${id}`);
}

export async function markPerformancePaid(id: number) {
  const { userId: adminId } = await requireAdmin();

  await db
    .update(performances)
    .set({
      status: "paid",
      paidAt: new Date(),
      paidBy: adminId,
      updatedAt: new Date(),
    })
    .where(eq(performances.id, id));

  revalidatePath("/admin/prestaties");
  revalidatePath(`/admin/prestaties/${id}`);
  revalidatePath("/trainer/prestaties");
  revalidatePath(`/trainer/prestaties/${id}`);
}

export async function markPerformanceUnpaid(id: number) {
  await requireAdmin();

  await db
    .update(performances)
    .set({
      status: "open",
      paidAt: null,
      paidBy: null,
      updatedAt: new Date(),
    })
    .where(eq(performances.id, id));

  revalidatePath("/admin/prestaties");
  revalidatePath(`/admin/prestaties/${id}`);
  revalidatePath("/trainer/prestaties");
  revalidatePath(`/trainer/prestaties/${id}`);
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

/**
 * Admin-only: delete any performance regardless of ownership or status.
 * Emits an auth_events row with type=admin_delete_performance for audit trail.
 * Cascades on attendances via FK ON DELETE CASCADE.
 */
export async function adminDeletePerformance(id: number): Promise<void> {
  const { userId: adminId } = await requireAdmin();

  const [existing] = await db
    .select({
      id: performances.id,
      userId: performances.userId,
      status: performances.status,
      performanceDate: performances.performanceDate,
      amount: performances.amount,
    })
    .from(performances)
    .where(eq(performances.id, id))
    .limit(1);
  if (!existing) throw new Error("Not found");

  const [adminUser] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, adminId))
    .limit(1);

  await db.delete(performances).where(eq(performances.id, id));

  // Structured audit log — auth_events has no details column so metadata goes
  // to the app log for grep/aggregation. The DB row proves who + when.
  console.log("[audit] admin_delete_performance", {
    adminId,
    performanceId: existing.id,
    trainerUserId: existing.userId,
    status: existing.status,
    performanceDate: existing.performanceDate,
    amount: existing.amount,
    at: new Date().toISOString(),
  });
  await logAuthEvent({
    email: adminUser?.email ?? "unknown",
    eventType: "admin_delete_performance",
    userId: adminId,
  });

  revalidatePath("/admin/prestaties");
  revalidatePath("/trainer/prestaties");
}

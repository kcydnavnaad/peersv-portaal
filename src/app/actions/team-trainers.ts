"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { teamTrainers } from "@/db/schema";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

export async function toggleTeamTrainer(teamId: number, userId: number) {
  await requireAdmin();

  const [existing] = await db
    .select()
    .from(teamTrainers)
    .where(
      and(eq(teamTrainers.teamId, teamId), eq(teamTrainers.userId, userId)),
    )
    .limit(1);

  if (existing) {
    await db.delete(teamTrainers).where(eq(teamTrainers.id, existing.id));
  } else {
    await db
      .insert(teamTrainers)
      .values({ teamId, userId, isHeadTrainer: false });
  }

  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath("/admin/teams");
  revalidatePath("/trainer");
}

export async function toggleHeadTrainer(teamId: number, userId: number) {
  await requireAdmin();

  const [existing] = await db
    .select()
    .from(teamTrainers)
    .where(
      and(eq(teamTrainers.teamId, teamId), eq(teamTrainers.userId, userId)),
    )
    .limit(1);

  if (!existing) return;

  await db
    .update(teamTrainers)
    .set({ isHeadTrainer: !existing.isHeadTrainer })
    .where(eq(teamTrainers.id, existing.id));

  revalidatePath(`/admin/teams/${teamId}`);
}

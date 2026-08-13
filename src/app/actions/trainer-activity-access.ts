"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { trainerActivityAccess, trainerRateOverrides } from "@/db/schema";
import { requireAdmin } from "./users";

export type SetActivityAccessResult = {
  ok: boolean;
  error?: string;
};

function normalizeRate(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const normalized = trimmed.replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

export async function setTrainerActivityAccess(
  trainerId: number,
  activityTypeId: number,
  hasAccess: boolean,
  rateInput: string,
): Promise<SetActivityAccessResult> {
  await requireAdmin();

  const rate = rateInput.trim() === "" ? null : normalizeRate(rateInput);
  if (rateInput.trim() !== "" && rate === null) {
    return { ok: false, error: "Ongeldig tarief." };
  }

  await db.transaction(async (tx) => {
    if (hasAccess) {
      await tx
        .insert(trainerActivityAccess)
        .values({ userId: trainerId, activityTypeId })
        .onConflictDoNothing({
          target: [
            trainerActivityAccess.userId,
            trainerActivityAccess.activityTypeId,
          ],
        });
    } else {
      await tx
        .delete(trainerActivityAccess)
        .where(
          and(
            eq(trainerActivityAccess.userId, trainerId),
            eq(trainerActivityAccess.activityTypeId, activityTypeId),
          ),
        );
    }

    if (rate === null) {
      await tx
        .delete(trainerRateOverrides)
        .where(
          and(
            eq(trainerRateOverrides.userId, trainerId),
            eq(trainerRateOverrides.activityTypeId, activityTypeId),
          ),
        );
    } else {
      await tx
        .insert(trainerRateOverrides)
        .values({ userId: trainerId, activityTypeId, rate })
        .onConflictDoUpdate({
          target: [
            trainerRateOverrides.userId,
            trainerRateOverrides.activityTypeId,
          ],
          set: { rate, updatedAt: new Date() },
        });
    }
  });

  revalidatePath(`/admin/trainers/${trainerId}`);
  return { ok: true };
}

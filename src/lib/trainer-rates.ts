import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { trainerRateOverrides, users } from "@/db/schema";

export async function resolveTrainerRate(
  userId: number,
  activityTypeId: number,
): Promise<string | null> {
  const [override] = await db
    .select({ rate: trainerRateOverrides.rate })
    .from(trainerRateOverrides)
    .where(
      and(
        eq(trainerRateOverrides.userId, userId),
        eq(trainerRateOverrides.activityTypeId, activityTypeId),
      ),
    )
    .limit(1);

  if (override) return override.rate;

  const [user] = await db
    .select({ rate: users.trainerRate })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.rate ?? null;
}

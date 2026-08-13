import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { activityTypes, trainerActivityAccess } from "@/db/schema";

export type ActivityTypeOption = {
  id: number;
  name: string;
  requiresTeam: boolean;
  isDefault: boolean;
};

export async function getActivityTypesForTrainer(
  userId: number,
): Promise<ActivityTypeOption[]> {
  const rows = await db
    .selectDistinct({
      id: activityTypes.id,
      name: activityTypes.name,
      requiresTeam: activityTypes.requiresTeam,
      isDefault: activityTypes.isDefault,
    })
    .from(activityTypes)
    .leftJoin(
      trainerActivityAccess,
      eq(trainerActivityAccess.activityTypeId, activityTypes.id),
    )
    .where(
      or(
        eq(activityTypes.isDefaultVisible, true),
        eq(trainerActivityAccess.userId, userId),
      ),
    )
    .orderBy(activityTypes.id);
  return rows;
}

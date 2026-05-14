import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons, teamTrainers, teams } from "@/db/schema";

export type TrainerTeamOption = {
  id: number;
  name: string;
  seasonName: string | null;
};

export async function getTeamOptionsForTrainer(
  userId: number,
  isButterfly: boolean,
): Promise<TrainerTeamOption[]> {
  if (isButterfly) {
    return db
      .select({
        id: teams.id,
        name: teams.name,
        seasonName: seasons.name,
      })
      .from(teams)
      .leftJoin(seasons, eq(teams.seasonId, seasons.id))
      .orderBy(asc(seasons.name), asc(teams.name));
  }
  return db
    .select({
      id: teams.id,
      name: teams.name,
      seasonName: seasons.name,
    })
    .from(teamTrainers)
    .innerJoin(teams, eq(teamTrainers.teamId, teams.id))
    .leftJoin(seasons, eq(teams.seasonId, seasons.id))
    .where(eq(teamTrainers.userId, userId))
    .orderBy(asc(seasons.name), asc(teams.name));
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { seasons, teams } from "@/db/schema";
import { requireAdmin } from "./users";

const createSeasonSchema = z.object({
  name: z.string().min(3).max(100),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum moet YYYY-MM-DD zijn"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum moet YYYY-MM-DD zijn"),
});

export type SeasonActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createSeason(
  _prev: SeasonActionState,
  formData: FormData,
): Promise<SeasonActionState> {
  await requireAdmin();

  const parsed = createSeasonSchema.safeParse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (!parsed.success) {
    return {
      error: "Ongeldige invoer.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(eq(seasons.name, parsed.data.name))
    .limit(1);

  if (existing.length > 0) {
    return { error: `Seizoen "${parsed.data.name}" bestaat al.` };
  }

  await db.insert(seasons).values({
    name: parsed.data.name,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    isActive: false,
  });

  revalidatePath("/admin/seasons");
  return { ok: true };
}

export async function activateSeason(
  seasonId: number,
): Promise<SeasonActionState> {
  await requireAdmin();

  await db.transaction(async (tx) => {
    await tx.update(seasons).set({ isActive: false });
    await tx
      .update(seasons)
      .set({ isActive: true })
      .where(eq(seasons.id, seasonId));
  });

  revalidatePath("/admin/seasons");
  revalidatePath("/admin/teams");
  return { ok: true };
}

export async function cloneTeamsToSeason(
  fromSeasonId: number,
  toSeasonId: number,
): Promise<SeasonActionState> {
  await requireAdmin();

  if (fromSeasonId === toSeasonId) {
    return { error: "Bron- en doelseizoen mogen niet hetzelfde zijn." };
  }

  const existingInTarget = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.seasonId, toSeasonId))
    .limit(1);

  if (existingInTarget.length > 0) {
    return {
      error:
        "Doelseizoen heeft al teams. Verwijder ze eerst of kies een leeg seizoen.",
    };
  }

  const sourceTeams = await db
    .select({ name: teams.name, category: teams.category })
    .from(teams)
    .where(eq(teams.seasonId, fromSeasonId));

  if (sourceTeams.length === 0) {
    return { error: "Bronseizoen heeft geen teams om te clonen." };
  }

  await db.insert(teams).values(
    sourceTeams.map((t) => ({
      name: t.name,
      category: t.category,
      seasonId: toSeasonId,
    })),
  );

  revalidatePath("/admin/seasons");
  revalidatePath("/admin/teams");
  return { ok: true };
}

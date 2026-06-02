"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { settings, teams } from "@/db/schema";
import { requireAdmin } from "./users";

function generateToken(): string {
  return randomBytes(16).toString("hex");
}

export async function ensureTeamCalendarToken(
  teamId: number,
): Promise<string> {
  await requireAdmin();

  const [team] = await db
    .select({ calendarToken: teams.calendarToken })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) throw new Error("Team niet gevonden");
  if (team.calendarToken) return team.calendarToken;

  const token = generateToken();
  await db
    .update(teams)
    .set({ calendarToken: token })
    .where(eq(teams.id, teamId));
  revalidatePath(`/admin/teams/${teamId}`);
  return token;
}

export async function regenerateTeamCalendarToken(
  teamId: number,
): Promise<{ token: string }> {
  await requireAdmin();
  const token = generateToken();
  await db
    .update(teams)
    .set({ calendarToken: token })
    .where(eq(teams.id, teamId));
  revalidatePath(`/admin/teams/${teamId}`);
  return { token };
}

export async function ensureClubCalendarToken(): Promise<string> {
  await requireAdmin();

  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "club_calendar_token"))
    .limit(1);

  if (row?.value) return row.value;

  const token = generateToken();
  await db.insert(settings).values({
    key: "club_calendar_token",
    value: token,
  });
  return token;
}

export async function regenerateClubCalendarToken(): Promise<{ token: string }> {
  await requireAdmin();
  const token = generateToken();

  const [existing] = await db
    .select({ key: settings.key })
    .from(settings)
    .where(eq(settings.key, "club_calendar_token"))
    .limit(1);

  if (existing) {
    await db
      .update(settings)
      .set({ value: token })
      .where(eq(settings.key, "club_calendar_token"));
  } else {
    await db.insert(settings).values({
      key: "club_calendar_token",
      value: token,
    });
  }

  revalidatePath("/admin/instellingen");
  return { token };
}

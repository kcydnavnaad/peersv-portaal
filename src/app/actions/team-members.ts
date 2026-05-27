"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

export async function addMemberToTeam(teamId: number, memberId: number) {
  await requireAdmin();

  // Check of er al een actieve koppeling bestaat (left_at IS NULL).
  // Database constraint voorkomt dit niet door NULL-uniqueness quirk.
  const existing = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.memberId, memberId),
        isNull(teamMembers.leftAt),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    // Al actief in dit team, niets te doen.
    revalidatePath(`/admin/teams/${teamId}`);
    return;
  }

  await db.insert(teamMembers).values({
    teamId,
    memberId,
    // joinedAt en createdAt krijgen default now()
  });

  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath("/admin/teams");
}

export async function removeMemberFromTeam(teamMemberId: number, teamId: number) {
  await requireAdmin();

  // Hybride strategie:
  // - Als joined_at == today: hard delete (admin fout corrigeren)
  // - Anders: soft delete via left_at = today (historie behouden)
  const [row] = await db
    .select({ joinedAt: teamMembers.joinedAt })
    .from(teamMembers)
    .where(eq(teamMembers.id, teamMemberId))
    .limit(1);

  if (!row) {
    revalidatePath(`/admin/teams/${teamId}`);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const joinedAt = row.joinedAt; // string "YYYY-MM-DD" omdat date kolom

  if (joinedAt === today) {
    await db.delete(teamMembers).where(eq(teamMembers.id, teamMemberId));
  } else {
    await db
      .update(teamMembers)
      .set({ leftAt: sql`current_date` })
      .where(eq(teamMembers.id, teamMemberId));
  }

  revalidatePath(`/admin/teams/${teamId}`);
  revalidatePath("/admin/teams");
}

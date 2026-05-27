"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { attendances, performances } from "@/db/schema";

async function requireTrainerOrAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "trainer" && role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function saveAttendances(
  performanceId: number,
  presentMemberIds: number[],
  absentMemberIds: number[],
) {
  const session = await requireTrainerOrAdmin();

  // Verify the performance exists and belongs to this trainer (unless admin)
  const [perf] = await db
    .select({
      id: performances.id,
      userId: performances.userId,
    })
    .from(performances)
    .where(eq(performances.id, performanceId))
    .limit(1);

  if (!perf) {
    throw new Error("Prestatie niet gevonden");
  }

  if (
    session?.user?.role === "trainer" &&
    perf.userId !== Number(session.user.id)
  ) {
    throw new Error("Niet jouw prestatie");
  }

  // Upsert present members
  for (const memberId of presentMemberIds) {
    await db
      .insert(attendances)
      .values({
        performanceId,
        memberId,
        present: true,
      })
      .onConflictDoUpdate({
        target: [attendances.performanceId, attendances.memberId],
        set: { present: true },
      });
  }

  // Upsert absent members
  for (const memberId of absentMemberIds) {
    await db
      .insert(attendances)
      .values({
        performanceId,
        memberId,
        present: false,
      })
      .onConflictDoUpdate({
        target: [attendances.performanceId, attendances.memberId],
        set: { present: false },
      });
  }

  revalidatePath(`/trainer/prestaties/${performanceId}`);
  revalidatePath("/trainer/prestaties");
  redirect(`/trainer/prestaties/${performanceId}`);
}

export async function skipAttendances(performanceId: number) {
  await requireTrainerOrAdmin();
  redirect(`/trainer/prestaties/${performanceId}`);
}

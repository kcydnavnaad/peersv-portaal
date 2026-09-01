"use server";

import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { performances } from "@/db/schema";

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

/**
 * Mark specific performances as sent for payment. Only affects rows currently
 * in 'open' status — 'sent' or 'paid' rows are left untouched.
 */
export async function markPerformancesAsSent(
  performanceIds: number[],
): Promise<{ count: number }> {
  const { userId } = await requireAdmin();
  if (performanceIds.length === 0) return { count: 0 };

  const result = await db
    .update(performances)
    .set({
      status: "sent",
      sentAt: new Date(),
      sentBy: userId,
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(performances.id, performanceIds),
        eq(performances.status, "open"),
      ),
    )
    .returning({ id: performances.id });

  revalidatePath("/admin/prestaties");
  revalidatePath("/admin/uitbetalingen");
  return { count: result.length };
}

/**
 * Unmark a specific sent performance — set status back to 'open'.
 */
export async function markPerformancesAsOpen(
  performanceIds: number[],
): Promise<{ count: number }> {
  await requireAdmin();
  if (performanceIds.length === 0) return { count: 0 };

  const result = await db
    .update(performances)
    .set({
      status: "open",
      sentAt: null,
      sentBy: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(performances.id, performanceIds),
        eq(performances.status, "sent"),
      ),
    )
    .returning({ id: performances.id });

  revalidatePath("/admin/prestaties");
  revalidatePath("/admin/uitbetalingen");
  return { count: result.length };
}

/**
 * Bulk-promote all currently-open performances matching optional filters.
 * `periodYearMonth` is a "YYYY-MM" string; when set, filters on that month.
 * `trainerId` scopes to a single trainer.
 */
export async function bulkMarkOpenAsSent(filters?: {
  trainerId?: number | null;
  periodYearMonth?: string | null;
}): Promise<{ count: number }> {
  const { userId } = await requireAdmin();

  const conditions = [eq(performances.status, "open")];
  if (filters?.trainerId) {
    conditions.push(eq(performances.userId, filters.trainerId));
  }
  if (filters?.periodYearMonth) {
    const m = /^(\d{4})-(\d{2})$/.exec(filters.periodYearMonth);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const monthStart = `${y}-${String(mo).padStart(2, "0")}-01`;
      const monthEnd =
        mo === 12
          ? `${y + 1}-01-01`
          : `${y}-${String(mo + 1).padStart(2, "0")}-01`;
      conditions.push(gte(performances.performanceDate, monthStart));
      conditions.push(lt(performances.performanceDate, monthEnd));
    }
  }

  const result = await db
    .update(performances)
    .set({
      status: "sent",
      sentAt: new Date(),
      sentBy: userId,
      updatedAt: new Date(),
    })
    .where(and(...conditions))
    .returning({ id: performances.id });

  revalidatePath("/admin/prestaties");
  revalidatePath("/admin/uitbetalingen");
  return { count: result.length };
}


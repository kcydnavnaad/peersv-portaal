"use server";

import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { performances, users } from "@/db/schema";
import {
  calculateYearTotal,
  getCapStatus,
  getPaymentCapYearly,
  type CapStatus,
} from "@/lib/payment-cap";
import { buildPayoutsCsv } from "@/lib/payout-csv";
import { actsAsTrainer } from "@/lib/users";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

export async function previewYearTotalAfterPayment(
  performanceId: number,
): Promise<{
  trainerName: string;
  yearTotal: number;
  status: CapStatus;
  cap: number;
}> {
  await requireAdmin();

  const [perf] = await db
    .select({
      userId: performances.userId,
      performanceDate: performances.performanceDate,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(performances)
    .innerJoin(users, eq(users.id, performances.userId))
    .where(eq(performances.id, performanceId))
    .limit(1);

  if (!perf) {
    throw new Error("Performance not found");
  }

  const year = new Date(perf.performanceDate).getFullYear();
  const yearTotal = await calculateYearTotal(perf.userId, year);
  const cap = await getPaymentCapYearly();

  return {
    trainerName: `${perf.firstName} ${perf.lastName}`,
    yearTotal,
    status: getCapStatus(yearTotal, cap),
    cap,
  };
}

export async function exportPayoutsCsv(
  year: number,
  month: number,
): Promise<{ csv: string; filename: string }> {
  await requireAdmin();
  const result = await buildPayoutsCsv({ year, month });
  return { csv: result.csv, filename: result.filename };
}

export async function previewMarkTrainerMonthAsPaid(
  trainerId: number,
  year: number,
  month: number,
): Promise<{
  trainerName: string;
  count: number;
  totalAmount: number;
  yearTotalAfter: number;
  cap: number;
  statusAfter: CapStatus;
}> {
  await requireAdmin();

  const [trainer] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(and(eq(users.id, trainerId), actsAsTrainer()))
    .limit(1);

  if (!trainer) {
    throw new Error("Trainer not found");
  }

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  // Som van openstaande prestaties in deze maand voor deze trainer
  const [agg] = await db
    .select({
      count: sql<number>`count(${performances.id})::int`,
      total: sql<string>`coalesce(sum(${performances.amount}), 0)`,
    })
    .from(performances)
    .where(
      and(
        eq(performances.userId, trainerId),
        inArray(performances.status, ["open", "sent"]),
        gte(performances.performanceDate, monthStart),
        lt(performances.performanceDate, monthEnd),
      ),
    );

  const yearTotalAfter = await calculateYearTotal(trainerId, year);
  // Note: yearTotalAfter al inclusief deze maand, want status maakt niet uit voor jaartotaal
  // (calculateYearTotal somt alle performances ongeacht status)

  const cap = await getPaymentCapYearly();

  return {
    trainerName: `${trainer.firstName} ${trainer.lastName}`,
    count: Number(agg?.count ?? 0),
    totalAmount: Number(agg?.total ?? 0),
    yearTotalAfter,
    cap,
    statusAfter: getCapStatus(yearTotalAfter, cap),
  };
}

export async function markTrainerMonthAsPaid(
  trainerId: number,
  year: number,
  month: number,
): Promise<{ updated: number }> {
  await requireAdmin();

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const result = await db
    .update(performances)
    .set({ status: "paid", updatedAt: new Date() })
    .where(
      and(
        eq(performances.userId, trainerId),
        inArray(performances.status, ["open", "sent"]),
        gte(performances.performanceDate, monthStart),
        lt(performances.performanceDate, monthEnd),
      ),
    )
    .returning({ id: performances.id });

  revalidatePath("/admin/uitbetalingen");
  revalidatePath("/admin/prestaties");

  return { updated: result.length };
}

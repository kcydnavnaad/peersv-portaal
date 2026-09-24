"use server";

import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { activityTypes, performances, teams, users } from "@/db/schema";
import {
  calculateYearTotal,
  getCapStatus,
  getPaymentCapYearly,
  type CapStatus,
} from "@/lib/payment-cap";
import {
  buildPayoutsXlsx,
  PAYOUT_XLSX_CONTENT_TYPE,
} from "@/lib/payout-xlsx";
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

function bufferToBytes(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

export async function exportPayoutsXlsx(
  year: number,
  month: number,
): Promise<{ bytes: Uint8Array; filename: string; contentType: string }> {
  await requireAdmin();
  const result = await buildPayoutsXlsx({ filter: { year, month } });
  return {
    bytes: bufferToBytes(result.buffer),
    filename: result.filename,
    contentType: PAYOUT_XLSX_CONTENT_TYPE,
  };
}

export async function exportMonthViewXlsx(
  year: number,
  month: number,
): Promise<{ bytes: Uint8Array; filename: string; contentType: string }> {
  await requireAdmin();
  const result = await buildPayoutsXlsx({
    filter: { year, month },
    mode: "monthView",
  });
  return {
    bytes: bufferToBytes(result.buffer),
    filename: result.filename,
    contentType: PAYOUT_XLSX_CONTENT_TYPE,
  };
}

/**
 * Return all distinct year-month values that have at least one performance,
 * newest first. Used to populate the maand-view dropdown.
 */
export async function getAvailablePayoutMonths(): Promise<string[]> {
  await requireAdmin();
  const rows = await db
    .selectDistinct({
      ym: sql<string>`to_char(${performances.performanceDate}, 'YYYY-MM')`,
    })
    .from(performances)
    .orderBy(sql`to_char(${performances.performanceDate}, 'YYYY-MM') desc`);
  return rows.map((r) => r.ym);
}

export type MonthViewPerformance = {
  id: number;
  performanceDate: string;
  activityName: string | null;
  teamName: string | null;
  amount: string;
  status: "open" | "sent" | "paid";
  notes: string | null;
};

export type MonthViewTrainer = {
  trainerId: number;
  trainerName: string;
  iban: string | null;
  openAmount: number;
  sentAmount: number;
  paidAmount: number;
  totalAmount: number;
  totalCount: number;
  performances: MonthViewPerformance[];
};

/**
 * Fetch all performances in a given month, grouped per trainer, with
 * per-status subtotals. Read-only view for /admin/uitbetalingen?maand=.
 */
export async function getMonthPerformances(
  year: number,
  month: number,
): Promise<MonthViewTrainer[]> {
  await requireAdmin();

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const rows = await db
    .select({
      id: performances.id,
      trainerId: performances.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      iban: users.iban,
      performanceDate: performances.performanceDate,
      amount: performances.amount,
      status: performances.status,
      notes: performances.notes,
      activityName: activityTypes.name,
      teamName: teams.name,
    })
    .from(performances)
    .innerJoin(users, eq(users.id, performances.userId))
    .leftJoin(activityTypes, eq(activityTypes.id, performances.activityTypeId))
    .leftJoin(teams, eq(teams.id, performances.teamId))
    .where(
      and(
        gte(performances.performanceDate, monthStart),
        lt(performances.performanceDate, monthEnd),
      ),
    )
    .orderBy(
      asc(users.lastName),
      asc(users.firstName),
      asc(performances.performanceDate),
    );

  const byTrainer = new Map<number, MonthViewTrainer>();
  for (const r of rows) {
    let bucket = byTrainer.get(r.trainerId);
    if (!bucket) {
      bucket = {
        trainerId: r.trainerId,
        trainerName: `${r.firstName} ${r.lastName}`,
        iban: r.iban,
        openAmount: 0,
        sentAmount: 0,
        paidAmount: 0,
        totalAmount: 0,
        totalCount: 0,
        performances: [],
      };
      byTrainer.set(r.trainerId, bucket);
    }
    const amt = Number(r.amount);
    bucket.totalAmount += amt;
    bucket.totalCount += 1;
    if (r.status === "open") bucket.openAmount += amt;
    else if (r.status === "sent") bucket.sentAmount += amt;
    else if (r.status === "paid") bucket.paidAmount += amt;
    bucket.performances.push({
      id: r.id,
      performanceDate: r.performanceDate,
      activityName: r.activityName,
      teamName: r.teamName,
      amount: r.amount,
      status: r.status,
      notes: r.notes,
    });
  }

  return Array.from(byTrainer.values());
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

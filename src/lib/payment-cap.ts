import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { performances, settings } from "@/db/schema";

const PAYMENT_CAP_FALLBACK = 3233.91;
export const PAYMENT_CAP_WARNING_RATIO = 0.8;

export type CapStatus = "ok" | "warning" | "exceeded";

/**
 * Haalt het jaarplafond op uit de settings tabel.
 * Valt terug op 3233.91 als de setting niet bestaat.
 */
export async function getPaymentCapYearly(): Promise<number> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "payment_cap_year"))
    .limit(1);

  if (!row) return PAYMENT_CAP_FALLBACK;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : PAYMENT_CAP_FALLBACK;
}

export function getCapStatus(yearTotal: number, cap: number): CapStatus {
  if (yearTotal >= cap) return "exceeded";
  if (yearTotal >= cap * PAYMENT_CAP_WARNING_RATIO) return "warning";
  return "ok";
}

export function yearBounds(year: number): { start: string; end: string } {
  return {
    start: `${year}-01-01`,
    end: `${year + 1}-01-01`,
  };
}

export async function calculateYearTotal(
  userId: number,
  year: number,
): Promise<number> {
  const { start, end } = yearBounds(year);
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${performances.amount}), 0)`,
    })
    .from(performances)
    .where(
      and(
        eq(performances.userId, userId),
        gte(performances.performanceDate, start),
        lt(performances.performanceDate, end),
      ),
    );
  return Number(row?.total ?? 0);
}

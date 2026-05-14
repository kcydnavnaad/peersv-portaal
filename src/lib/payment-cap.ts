import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { performances } from "@/db/schema";

export const PAYMENT_CAP_YEARLY = 3233.91;
export const PAYMENT_CAP_WARNING_RATIO = 0.8;

export type CapStatus = "ok" | "warning" | "exceeded";

export function getCapStatus(yearTotal: number): CapStatus {
  if (yearTotal >= PAYMENT_CAP_YEARLY) return "exceeded";
  if (yearTotal >= PAYMENT_CAP_YEARLY * PAYMENT_CAP_WARNING_RATIO)
    return "warning";
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
      total: sql<string>`coalesce(sum(${performances.amount}), 0)`,
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

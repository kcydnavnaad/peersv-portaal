import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { performances, users } from "@/db/schema";
import { actsAsTrainer } from "./users";

const DUTCH_MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export type PayoutCsvResult = {
  csv: string;
  filename: string;
  rowCount: number;
  totalAmount: number;
  monthLabel: string;
  performanceIds: number[];
};

/**
 * Build a payouts CSV of open performances, aggregated per trainer.
 *
 * `filter`: when supplied, restricts to performances in the given month.
 * When omitted, all open performances (any date) are included — used by the
 * monthly cron export.
 *
 * The Mededeling column (payment reference) always uses the label of the
 * supplied month, falling back to the current month.
 */
export async function buildPayoutsCsv(filter?: {
  year: number;
  month: number;
}): Promise<PayoutCsvResult> {
  const now = new Date();
  const labelYear = filter?.year ?? now.getFullYear();
  const labelMonth = filter?.month ?? now.getMonth() + 1;
  const monthLabel = `${DUTCH_MONTHS[labelMonth - 1]} ${labelYear}`;

  const conditions = [eq(performances.status, "open")];
  if (filter) {
    const monthStart = `${filter.year}-${String(filter.month).padStart(2, "0")}-01`;
    const monthEnd =
      filter.month === 12
        ? `${filter.year + 1}-01-01`
        : `${filter.year}-${String(filter.month + 1).padStart(2, "0")}-01`;
    conditions.push(gte(performances.performanceDate, monthStart));
    conditions.push(lt(performances.performanceDate, monthEnd));
  }

  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      iban: users.iban,
      openAmount: sql<string>`coalesce(sum(${performances.amount}), 0)`,
      openCount: sql<number>`count(${performances.id})::int`,
      performanceIds: sql<
        number[]
      >`array_agg(${performances.id} order by ${performances.performanceDate})`,
    })
    .from(users)
    .innerJoin(performances, and(eq(performances.userId, users.id), ...conditions))
    .where(actsAsTrainer())
    .groupBy(users.id)
    .having(sql`coalesce(sum(${performances.amount}), 0) > 0`)
    .orderBy(asc(users.lastName), asc(users.firstName));

  const header = [
    "Trainer",
    "IBAN",
    "Open bedrag",
    "Mededeling",
    "Aantal prestaties",
  ];
  const lines = [header.map(csvEscape).join(",")];
  let totalAmount = 0;
  const performanceIds: number[] = [];
  for (const r of rows) {
    const amount = Number(r.openAmount);
    totalAmount += amount;
    if (Array.isArray(r.performanceIds)) {
      for (const id of r.performanceIds) performanceIds.push(id);
    }
    lines.push(
      [
        csvEscape(`${r.firstName} ${r.lastName}`),
        csvEscape(r.iban ?? ""),
        csvEscape(amount.toFixed(2)),
        csvEscape(`Vergoeding ${monthLabel}`),
        csvEscape(String(r.openCount)),
      ].join(","),
    );
  }

  const filename = filter
    ? `uitbetalingen-${filter.year}-${String(filter.month).padStart(2, "0")}.csv`
    : `peersv-uitbetalingen-${labelYear}-${String(labelMonth).padStart(2, "0")}.csv`;

  return {
    csv: lines.join("\n") + "\n",
    filename,
    rowCount: rows.length,
    totalAmount,
    monthLabel,
    performanceIds,
  };
}

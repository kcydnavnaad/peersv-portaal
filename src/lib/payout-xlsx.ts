import ExcelJS from "exceljs";
import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityTypes, performances, teams, users } from "@/db/schema";
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

export const PAYOUT_XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type PayoutXlsxResult = {
  buffer: Buffer;
  filename: string;
  rowCount: number;
  totalAmount: number;
  monthLabel: string;
  performanceIds: number[];
};

// Excel sheet name restrictions: max 31 chars, no /\?*[]:
function sanitizeSheetName(raw: string): string {
  const cleaned = raw.replace(/[\\/?*[\]:]/g, "").trim();
  return cleaned.slice(0, 31) || "Trainer";
}

// Ensure unique across the workbook; append a numeric suffix on collision
// while keeping the 31-char cap.
function uniqueSheetName(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  for (let i = 2; i < 100; i++) {
    const suffix = ` (${i})`;
    const candidate = base.slice(0, 31 - suffix.length) + suffix;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  const fallback = `Trainer ${Date.now()}`.slice(0, 31);
  used.add(fallback);
  return fallback;
}

/**
 * Build a payouts XLSX of open performances.
 *
 * Two-tab layout:
 *  - Overzicht: one row per trainer (IBAN, total amount, count, mededeling)
 *  - One tab per trainer with performances (details: date/type/team/amount/notes)
 *
 * `filter`: when supplied, restricts to performances in the given month.
 * When omitted, all open performances (any date) are included.
 */
export async function buildPayoutsXlsx(filter?: {
  year: number;
  month: number;
}): Promise<PayoutXlsxResult> {
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

  // Summary per trainer
  const summaryRows = await db
    .select({
      trainerId: users.id,
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

  const performanceIds: number[] = [];
  for (const r of summaryRows) {
    if (Array.isArray(r.performanceIds)) {
      for (const id of r.performanceIds) performanceIds.push(id);
    }
  }

  // Detail per performance for the tabs
  const detailRows =
    performanceIds.length > 0
      ? await db
          .select({
            id: performances.id,
            trainerId: performances.userId,
            trainerName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
            performanceDate: performances.performanceDate,
            amount: performances.amount,
            notes: performances.notes,
            activityName: activityTypes.name,
            teamName: teams.name,
          })
          .from(performances)
          .innerJoin(users, eq(users.id, performances.userId))
          .leftJoin(
            activityTypes,
            eq(activityTypes.id, performances.activityTypeId),
          )
          .leftJoin(teams, eq(teams.id, performances.teamId))
          .where(inArray(performances.id, performanceIds))
          .orderBy(
            asc(users.lastName),
            asc(users.firstName),
            asc(performances.performanceDate),
          )
      : [];

  const detailByTrainer = new Map<number, typeof detailRows>();
  for (const d of detailRows) {
    const list = detailByTrainer.get(d.trainerId) ?? [];
    list.push(d);
    detailByTrainer.set(d.trainerId, list);
  }

  // Build workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PeerSV Portaal";
  workbook.created = new Date();

  const overview = workbook.addWorksheet("Overzicht");
  overview.columns = [
    { header: "Trainer", key: "trainer", width: 30 },
    { header: "IBAN", key: "iban", width: 25 },
    {
      header: "Open bedrag",
      key: "amount",
      width: 15,
      style: { numFmt: '"€" #,##0.00' },
    },
    { header: "Mededeling", key: "message", width: 30 },
    { header: "Aantal prestaties", key: "count", width: 18 },
  ];
  overview.getRow(1).font = { bold: true };

  let totalAmount = 0;
  for (const r of summaryRows) {
    const amount = Number(r.openAmount);
    totalAmount += amount;
    overview.addRow({
      trainer: `${r.firstName} ${r.lastName}`,
      iban: r.iban ?? "",
      amount,
      message: `Vergoeding ${monthLabel}`,
      count: Number(r.openCount),
    });
  }

  overview.addRow({});
  const totalRow = overview.addRow({
    trainer: "TOTAAL",
    amount: totalAmount,
  });
  totalRow.font = { bold: true };

  // Per-trainer detail tabs
  const usedSheetNames = new Set<string>(["Overzicht"]);
  for (const summary of summaryRows) {
    const details = detailByTrainer.get(summary.trainerId) ?? [];
    if (details.length === 0) continue;

    const baseName = sanitizeSheetName(
      `${summary.firstName} ${summary.lastName}`,
    );
    const sheetName = uniqueSheetName(baseName, usedSheetNames);
    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = [
      { header: "Trainer", key: "trainer", width: 25 },
      {
        header: "Datum",
        key: "date",
        width: 12,
        style: { numFmt: "dd/mm/yyyy" },
      },
      { header: "Type", key: "type", width: 20 },
      { header: "Ploeg", key: "team", width: 18 },
      {
        header: "Bedrag",
        key: "amount",
        width: 12,
        style: { numFmt: '"€" #,##0.00' },
      },
      { header: "Notities", key: "notes", width: 40 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const d of details) {
      // performanceDate is a "YYYY-MM-DD" string from drizzle (date column);
      // convert to a Date so Excel formats it as a date, not text.
      const [y, m, day] = d.performanceDate.split("-").map(Number);
      const asDate = new Date(Date.UTC(y, m - 1, day));
      sheet.addRow({
        trainer: d.trainerName,
        date: asDate,
        type: d.activityName ?? "-",
        team: d.teamName ?? "-",
        amount: Number(d.amount),
        notes: d.notes ?? "",
      });
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer as ArrayBuffer);

  const filename = filter
    ? `uitbetalingen-${filter.year}-${String(filter.month).padStart(2, "0")}.xlsx`
    : `peersv-uitbetalingen-${labelYear}-${String(labelMonth).padStart(2, "0")}.xlsx`;

  return {
    buffer,
    filename,
    rowCount: summaryRows.length,
    totalAmount,
    monthLabel,
    performanceIds,
  };
}

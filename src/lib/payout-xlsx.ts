import ExcelJS from "exceljs";
import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityTypes, performances, teams, users } from "@/db/schema";
import { performanceStatusLabel } from "./performances";
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

export type PayoutXlsxMode = "open" | "monthView";

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

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, end };
}

/**
 * Build a payouts XLSX.
 *
 * Modes:
 *  - `open` (default): open performances only. Overview has one "Open bedrag"
 *    column. Used by the bank-transfer export and the monthly cron mail.
 *  - `monthView`: read-only overview of ALL performances (open/sent/paid) in
 *    the given month. Overview splits amounts per status; detail tabs get an
 *    extra Status column. Requires `filter`.
 *
 * `filter`: when supplied, restricts to performances in the given month.
 * For `open` mode filter is optional (omit for cron all-time); for
 * `monthView` filter is required.
 */
export async function buildPayoutsXlsx(options?: {
  filter?: { year: number; month: number };
  mode?: PayoutXlsxMode;
}): Promise<PayoutXlsxResult> {
  const mode: PayoutXlsxMode = options?.mode ?? "open";
  const filter = options?.filter;
  if (mode === "monthView" && !filter) {
    throw new Error("monthView requires filter { year, month }");
  }

  const now = new Date();
  const labelYear = filter?.year ?? now.getFullYear();
  const labelMonth = filter?.month ?? now.getMonth() + 1;
  const monthLabel = `${DUTCH_MONTHS[labelMonth - 1]} ${labelYear}`;

  const conditions = [];
  if (mode === "open") {
    conditions.push(eq(performances.status, "open"));
  }
  if (filter) {
    const { start, end } = monthRange(filter.year, filter.month);
    conditions.push(gte(performances.performanceDate, start));
    conditions.push(lt(performances.performanceDate, end));
  }

  const summaryRows =
    mode === "open"
      ? await db
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
          .innerJoin(
            performances,
            and(eq(performances.userId, users.id), ...conditions),
          )
          .where(actsAsTrainer())
          .groupBy(users.id)
          .having(sql`coalesce(sum(${performances.amount}), 0) > 0`)
          .orderBy(asc(users.lastName), asc(users.firstName))
      : await db
          .select({
            trainerId: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            iban: users.iban,
            openAmount: sql<string>`coalesce(sum(case when ${performances.status} = 'open' then ${performances.amount} else 0 end), 0)`,
            sentAmount: sql<string>`coalesce(sum(case when ${performances.status} = 'sent' then ${performances.amount} else 0 end), 0)`,
            paidAmount: sql<string>`coalesce(sum(case when ${performances.status} = 'paid' then ${performances.amount} else 0 end), 0)`,
            totalAmount: sql<string>`coalesce(sum(${performances.amount}), 0)`,
            openCount: sql<number>`count(${performances.id})::int`,
            performanceIds: sql<
              number[]
            >`array_agg(${performances.id} order by ${performances.performanceDate})`,
          })
          .from(users)
          .innerJoin(
            performances,
            and(eq(performances.userId, users.id), ...conditions),
          )
          .where(actsAsTrainer())
          .groupBy(users.id)
          .orderBy(asc(users.lastName), asc(users.firstName));

  const performanceIds: number[] = [];
  for (const r of summaryRows) {
    if (Array.isArray(r.performanceIds)) {
      for (const id of r.performanceIds) performanceIds.push(id);
    }
  }

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
            status: performances.status,
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
  if (mode === "open") {
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
  } else {
    overview.columns = [
      { header: "Trainer", key: "trainer", width: 30 },
      { header: "IBAN", key: "iban", width: 25 },
      {
        header: "Open",
        key: "openAmount",
        width: 12,
        style: { numFmt: '"€" #,##0.00' },
      },
      {
        header: "Doorgestuurd",
        key: "sentAmount",
        width: 14,
        style: { numFmt: '"€" #,##0.00' },
      },
      {
        header: "Betaald",
        key: "paidAmount",
        width: 12,
        style: { numFmt: '"€" #,##0.00' },
      },
      {
        header: "Totaal",
        key: "totalAmount",
        width: 12,
        style: { numFmt: '"€" #,##0.00' },
      },
      { header: "Aantal", key: "count", width: 10 },
    ];
  }
  overview.getRow(1).font = { bold: true };

  let totalAmount = 0;
  if (mode === "open") {
    for (const r of summaryRows) {
      const amount = Number(r.openAmount ?? 0);
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
  } else {
    let openSum = 0;
    let sentSum = 0;
    let paidSum = 0;
    for (const r of summaryRows) {
      const o = Number(r.openAmount ?? 0);
      const s = Number((r as { sentAmount?: string }).sentAmount ?? 0);
      const p = Number((r as { paidAmount?: string }).paidAmount ?? 0);
      const t = Number((r as { totalAmount?: string }).totalAmount ?? o + s + p);
      openSum += o;
      sentSum += s;
      paidSum += p;
      totalAmount += t;
      overview.addRow({
        trainer: `${r.firstName} ${r.lastName}`,
        iban: r.iban ?? "",
        openAmount: o,
        sentAmount: s,
        paidAmount: p,
        totalAmount: t,
        count: Number(r.openCount),
      });
    }
    overview.addRow({});
    const totalRow = overview.addRow({
      trainer: "TOTAAL",
      openAmount: openSum,
      sentAmount: sentSum,
      paidAmount: paidSum,
      totalAmount,
    });
    totalRow.font = { bold: true };
  }

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
    const detailColumns: Partial<ExcelJS.Column>[] = [
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
    ];
    if (mode === "monthView") {
      detailColumns.push({ header: "Status", key: "status", width: 14 });
    }
    detailColumns.push({ header: "Notities", key: "notes", width: 40 });
    sheet.columns = detailColumns as ExcelJS.Column[];
    sheet.getRow(1).font = { bold: true };

    for (const d of details) {
      const [y, m, day] = d.performanceDate.split("-").map(Number);
      const asDate = new Date(Date.UTC(y, m - 1, day));
      const row: Record<string, unknown> = {
        trainer: d.trainerName,
        date: asDate,
        type: d.activityName ?? "-",
        team: d.teamName ?? "-",
        amount: Number(d.amount),
        notes: d.notes ?? "",
      };
      if (mode === "monthView") {
        row.status = performanceStatusLabel[d.status];
      }
      sheet.addRow(row);
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.from(arrayBuffer as ArrayBuffer);

  const filename =
    mode === "monthView" && filter
      ? `peersv-maandoverzicht-${filter.year}-${String(filter.month).padStart(2, "0")}.xlsx`
      : filter
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

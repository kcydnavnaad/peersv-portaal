import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { performances, users } from "@/db/schema";
import {
  getAvailablePayoutMonths,
  getMonthPerformances,
} from "@/app/actions/payouts";
import { formatAmount, performanceStatusLabel } from "@/lib/performances";
import {
  getCapStatus,
  getPaymentCapYearly,
  type CapStatus,
} from "@/lib/payment-cap";
import { actsAsTrainer } from "@/lib/users";
import { BulkSendButton } from "./_components/bulk-send-button";
import { ExportMonthXlsxButton } from "./_components/export-month-xlsx-button";
import { ExportXlsxButton } from "./_components/export-xlsx-button";
import { MarkMonthPaidButton } from "./_components/mark-month-paid-button";
import { MonthFilter } from "./_components/month-filter";
import { MonthSelector } from "./_components/month-selector";
import { PayoutCard } from "./_components/payout-card";

export const dynamic = "force-dynamic";

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

function parseMonth(value: string | undefined, fallback: { year: number; month: number }) {
  if (!value) return fallback;
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return fallback;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return fallback;
  return { year: y, month: mo };
}

function buildMonthOptions(currentYear: number) {
  const now = new Date();
  const isCurrent = (y: number, m: number) =>
    y === now.getFullYear() && m === now.getMonth() + 1;

  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const opts: { value: string; label: string }[] = [
    {
      value: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      label: `Deze maand (${DUTCH_MONTHS[now.getMonth()]} ${now.getFullYear()})`,
    },
    {
      value: `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`,
      label: `Vorige maand (${DUTCH_MONTHS[prev.getMonth()]} ${prev.getFullYear()})`,
    },
  ];

  for (let m = 12; m >= 1; m--) {
    if (isCurrent(currentYear, m)) continue;
    if (
      currentYear === prev.getFullYear() &&
      m === prev.getMonth() + 1
    )
      continue;
    opts.push({
      value: `${currentYear}-${String(m).padStart(2, "0")}`,
      label: `${DUTCH_MONTHS[m - 1]} ${currentYear}`,
    });
  }
  return opts;
}

function capBadge(status: CapStatus) {
  if (status === "exceeded") {
    return (
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-800">
        Plafond overschreden
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
        Bijna plafond
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
      OK
    </span>
  );
}

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; maand?: string }>;
}) {
  const now = new Date();
  const sp = await searchParams;

  const availableMonths = await getAvailablePayoutMonths();
  const maandValid =
    sp.maand && /^\d{4}-\d{2}$/.test(sp.maand) ? sp.maand : null;

  if (maandValid) {
    return renderMonthView({
      maand: maandValid,
      availableMonths,
    });
  }

  const { year, month } = parseMonth(sp.month, {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const cap = await getPaymentCapYearly();

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year + 1}-01-01`;

  const monthValue = `${year}-${String(month).padStart(2, "0")}`;
  const monthLabel = `${DUTCH_MONTHS[month - 1]} ${year}`;

  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      openMonth: sql<string>`coalesce(sum(case when ${performances.status} = 'open' and ${performances.performanceDate} >= ${monthStart} and ${performances.performanceDate} < ${monthEnd} then ${performances.amount} end), 0)`,
      sentMonth: sql<string>`coalesce(sum(case when ${performances.status} = 'sent' and ${performances.performanceDate} >= ${monthStart} and ${performances.performanceDate} < ${monthEnd} then ${performances.amount} end), 0)`,
      paidMonth: sql<string>`coalesce(sum(case when ${performances.status} = 'paid' and ${performances.performanceDate} >= ${monthStart} and ${performances.performanceDate} < ${monthEnd} then ${performances.amount} end), 0)`,
      openCount: sql<number>`(count(case when ${performances.status} = 'open' and ${performances.performanceDate} >= ${monthStart} and ${performances.performanceDate} < ${monthEnd} then ${performances.id} end))::int`,
      yearTotal: sql<string>`coalesce(sum(case when ${performances.performanceDate} >= ${yearStart} and ${performances.performanceDate} < ${yearEnd} then ${performances.amount} end), 0)`,
    })
    .from(users)
    .leftJoin(performances, eq(performances.userId, users.id))
    .where(actsAsTrainer())
    .groupBy(users.id)
    .orderBy(
      desc(sql`coalesce(sum(case when ${performances.status} = 'open' and ${performances.performanceDate} >= ${monthStart} and ${performances.performanceDate} < ${monthEnd} then ${performances.amount} end), 0)`),
    );

  const totalOpenMonth = rows.reduce((s, r) => s + Number(r.openMonth), 0);
  const totalSentMonth = rows.reduce((s, r) => s + Number(r.sentMonth), 0);
  const totalOpenCount = rows.reduce((s, r) => s + Number(r.openCount), 0);
  const monthOptions = buildMonthOptions(year);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Uitbetalingen
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Plafond per kalenderjaar:{" "}
            {formatAmount(cap.toFixed(2))} per trainer.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ExportXlsxButton year={year} month={month} />
          <BulkSendButton
            periodYearMonth={monthValue}
            monthLabel={monthLabel}
            openCount={totalOpenCount}
            openTotalLabel={formatAmount(totalOpenMonth.toFixed(2))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:max-w-xs">
          <MonthFilter options={monthOptions} current={monthValue} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:max-w-xs">
          <MonthSelector months={availableMonths} current={null} />
        </div>
      </div>

      <>
        {/* Desktop: tabel */}
        <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Trainer</th>
                <th className="px-4 py-3 text-right">Open ({monthLabel})</th>
                <th className="px-4 py-3 text-right">Doorgestuurd</th>
                <th className="px-4 py-3 text-right">
                  Betaald ({monthLabel})
                </th>
                <th className="px-4 py-3 text-right">Jaartotaal {year}</th>
                <th className="px-4 py-3">Plafond</th>
                <th className="px-4 py-3 text-right">Actie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const yt = Number(r.yearTotal);
                const status = getCapStatus(yt, cap);
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      {r.firstName} {r.lastName}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatAmount(r.openMonth)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-800">
                      {formatAmount(r.sentMonth)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {formatAmount(r.paidMonth)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {formatAmount(r.yearTotal)}
                    </td>
                    <td className="px-4 py-3">{capBadge(status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <MarkMonthPaidButton
                          trainerId={r.id}
                          year={year}
                          month={month}
                          monthLabel={monthLabel}
                          hasUnpaid={
                            Number(r.openMonth) > 0 ||
                            Number(r.sentMonth) > 0
                          }
                        />
                        <Link
                          href={`/admin/prestaties?trainer=${r.id}&period=month`}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
                        >
                          Bekijk prestaties
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50">
              <tr>
                <td className="px-4 py-3 font-medium">Totaal</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {formatAmount(totalOpenMonth.toFixed(2))}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-amber-800">
                  {formatAmount(totalSentMonth.toFixed(2))}
                </td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden space-y-3">
          {rows.map((r) => (
            <PayoutCard
              key={r.id}
              id={r.id}
              firstName={r.firstName}
              lastName={r.lastName}
              openMonth={r.openMonth}
              sentMonth={r.sentMonth}
              paidMonth={r.paidMonth}
              yearTotal={r.yearTotal}
              monthLabel={monthLabel}
              year={year}
              month={month}
              cap={cap}
            />
          ))}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">Totaal openstaand</span>
              <span className="tabular-nums font-medium">
                {formatAmount(totalOpenMonth.toFixed(2))}
              </span>
            </div>
            <div className="flex items-center justify-between text-amber-800">
              <span>Totaal doorgestuurd</span>
              <span className="tabular-nums font-medium">
                {formatAmount(totalSentMonth.toFixed(2))}
              </span>
            </div>
          </div>
        </div>
      </>
    </div>
  );
}

async function renderMonthView({
  maand,
  availableMonths,
}: {
  maand: string;
  availableMonths: string[];
}) {
  const [yStr, mStr] = maand.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  const monthLabel = `${DUTCH_MONTHS[month - 1]} ${year}`;

  const trainers = await getMonthPerformances(year, month);

  const totals = trainers.reduce(
    (acc, t) => {
      acc.open += t.openAmount;
      acc.sent += t.sentAmount;
      acc.paid += t.paidAmount;
      acc.total += t.totalAmount;
      acc.count += t.totalCount;
      return acc;
    },
    { open: 0, sent: 0, paid: 0, total: 0, count: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Maand-overzicht — {monthLabel}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Alle prestaties (open, doorgestuurd én betaald) met performance-datum
            in {monthLabel}. Read-only.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ExportMonthXlsxButton year={year} month={month} />
          <Link
            href="/admin/uitbetalingen"
            className="text-xs text-slate-600 hover:underline"
          >
            ← Terug naar open-modus
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:max-w-xs">
        <MonthSelector months={availableMonths} current={maand} />
      </div>

      {trainers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Geen prestaties in {monthLabel}.
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="grid grid-cols-2 gap-y-1 sm:grid-cols-5">
              <div>
                <span className="text-slate-500">Open</span>
                <div className="tabular-nums font-medium">
                  {formatAmount(totals.open.toFixed(2))}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Doorgestuurd</span>
                <div className="tabular-nums font-medium text-amber-800">
                  {formatAmount(totals.sent.toFixed(2))}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Betaald</span>
                <div className="tabular-nums font-medium text-emerald-800">
                  {formatAmount(totals.paid.toFixed(2))}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Totaal</span>
                <div className="tabular-nums font-semibold">
                  {formatAmount(totals.total.toFixed(2))}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Aantal prestaties</span>
                <div className="tabular-nums">{totals.count}</div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Trainer</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Ploeg</th>
                  <th className="px-4 py-3 text-right">Bedrag</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notities</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trainers.flatMap((t) =>
                  t.performances.map((p, i) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium">
                        {i === 0 ? t.trainerName : ""}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.performanceDate}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.activityName ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.teamName ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {formatAmount(p.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <MonthStatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.notes ?? ""}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function MonthStatusBadge({ status }: { status: "open" | "sent" | "paid" }) {
  const cls =
    status === "paid"
      ? "bg-emerald-50 text-emerald-800"
      : status === "sent"
        ? "bg-amber-50 text-amber-800"
        : "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>
      {performanceStatusLabel[status]}
    </span>
  );
}

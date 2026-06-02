import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { performances, users } from "@/db/schema";
import { formatAmount } from "@/lib/performances";
import {
  getCapStatus,
  getPaymentCapYearly,
  type CapStatus,
} from "@/lib/payment-cap";
import { ExportCsvButton } from "./_components/export-csv-button";
import { MarkMonthPaidButton } from "./_components/mark-month-paid-button";
import { MonthFilter } from "./_components/month-filter";
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
  searchParams: Promise<{ month?: string }>;
}) {
  const now = new Date();
  const sp = await searchParams;
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
      paidMonth: sql<string>`coalesce(sum(case when ${performances.status} = 'paid' and ${performances.performanceDate} >= ${monthStart} and ${performances.performanceDate} < ${monthEnd} then ${performances.amount} end), 0)`,
      yearTotal: sql<string>`coalesce(sum(case when ${performances.performanceDate} >= ${yearStart} and ${performances.performanceDate} < ${yearEnd} then ${performances.amount} end), 0)`,
    })
    .from(users)
    .leftJoin(performances, eq(performances.userId, users.id))
    .where(eq(users.role, "trainer"))
    .groupBy(users.id)
    .orderBy(
      desc(sql`coalesce(sum(case when ${performances.status} = 'open' and ${performances.performanceDate} >= ${monthStart} and ${performances.performanceDate} < ${monthEnd} then ${performances.amount} end), 0)`),
    );

  const totalOpenMonth = rows.reduce((s, r) => s + Number(r.openMonth), 0);
  const monthOptions = buildMonthOptions(year);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Uitbetalingen
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Plafond per kalenderjaar:{" "}
            {formatAmount(cap.toFixed(2))} per trainer.
          </p>
        </div>
        <ExportCsvButton year={year} month={month} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:max-w-xs">
        <MonthFilter options={monthOptions} current={monthValue} />
      </div>

      <>
        {/* Desktop: tabel */}
        <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Trainer</th>
                <th className="px-4 py-3 text-right">Open ({monthLabel})</th>
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
                          hasOpen={Number(r.openMonth) > 0}
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
                <td className="px-4 py-3 font-medium">Totaal openstaand</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {formatAmount(totalOpenMonth.toFixed(2))}
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
              paidMonth={r.paidMonth}
              yearTotal={r.yearTotal}
              monthLabel={monthLabel}
              year={year}
              month={month}
              cap={cap}
            />
          ))}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">Totaal openstaand</span>
              <span className="tabular-nums font-medium">
                {formatAmount(totalOpenMonth.toFixed(2))}
              </span>
            </div>
          </div>
        </div>
      </>
    </div>
  );
}

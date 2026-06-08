import { and, asc, desc, eq, gte, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { performances, teams, users } from "@/db/schema";
import {
  parsePeriod,
  parseStatusFilter,
  parseTrainerId,
  periodRange,
} from "@/lib/performance-filters";
import {
  formatAmount,
  performanceStatusLabel,
  performanceTypeLabel,
} from "@/lib/performances";
import { actsAsTrainer } from "@/lib/users";
import { FiltersBar } from "./_components/filters-bar";
import { PaymentToggleButton } from "./_components/payment-toggle-button";
import { PerformanceCard } from "./_components/performance-card";
import { PerformanceRow } from "./_components/performance-row";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("nl-BE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const trainerUser = alias(users, "trainer_user");

export default async function AdminPerformancesListPage({
  searchParams,
}: {
  searchParams: Promise<{
    trainer?: string;
    status?: string;
    period?: string;
  }>;
}) {
  const sp = await searchParams;
  const trainerId = parseTrainerId(sp.trainer);
  const status = parseStatusFilter(sp.status);
  const period = parsePeriod(sp.period);
  const range = periodRange(period);

  const conditions = [];
  if (trainerId !== null) conditions.push(eq(performances.userId, trainerId));
  if (status !== "all") conditions.push(eq(performances.status, status));
  if (range.from) conditions.push(gte(performances.performanceDate, range.from));
  if (range.to) conditions.push(lt(performances.performanceDate, range.to));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, trainerOptions, totals] = await Promise.all([
    db
      .select({
        id: performances.id,
        date: performances.performanceDate,
        type: performances.type,
        amount: performances.amount,
        status: performances.status,
        trainerName: sql<string>`${trainerUser.firstName} || ' ' || ${trainerUser.lastName}`,
        teamName: teams.name,
      })
      .from(performances)
      .innerJoin(trainerUser, eq(trainerUser.id, performances.userId))
      .leftJoin(teams, eq(teams.id, performances.teamId))
      .where(where)
      .orderBy(desc(performances.performanceDate), desc(performances.id)),
    db
      .select({
        id: users.id,
        name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(users)
      .where(actsAsTrainer())
      .orderBy(asc(users.lastName), asc(users.firstName)),
    db
      .select({
        total: sql<string>`coalesce(sum(${performances.amount}), 0)`,
        open: sql<string>`coalesce(sum(case when ${performances.status} = 'open' then ${performances.amount} else 0 end), 0)`,
        paid: sql<string>`coalesce(sum(case when ${performances.status} = 'paid' then ${performances.amount} else 0 end), 0)`,
      })
      .from(performances)
      .innerJoin(trainerUser, eq(trainerUser.id, performances.userId))
      .where(where),
  ]);

  const totalRow = totals[0] ?? { total: "0", open: "0", paid: "0" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Prestaties</h1>
        <p className="mt-1 text-sm text-slate-600">
          {rows.length}{" "}
          {rows.length === 1 ? "prestatie" : "prestaties"} ·{" "}
          {formatAmount(totalRow.open)} open · {formatAmount(totalRow.paid)}{" "}
          betaald
        </p>
      </div>

      <FiltersBar trainers={trainerOptions} />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Geen prestaties voor deze filters.
        </div>
      ) : (
        <>
          {/* Desktop: tabel */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Trainer</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Ploeg</th>
                  <th className="px-4 py-3 text-right">Bedrag</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <PerformanceRow key={p.id} id={p.id}>
                    <td className="px-4 py-3 font-medium">{p.trainerName}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(p.date)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {performanceTypeLabel[p.type]}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.teamName ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {formatAmount(p.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PaymentToggleButton id={p.id} status={p.status} />
                    </td>
                  </PerformanceRow>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {rows.map((p) => (
              <PerformanceCard
                key={p.id}
                id={p.id}
                date={p.date}
                type={p.type}
                amount={p.amount}
                status={p.status}
                trainerName={p.trainerName}
                teamName={p.teamName}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "open" | "paid" }) {
  const cls =
    status === "paid"
      ? "bg-emerald-50 text-emerald-800"
      : "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>
      {performanceStatusLabel[status]}
    </span>
  );
}

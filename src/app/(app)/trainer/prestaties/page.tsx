import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { activityTypes, performances, teams } from "@/db/schema";
import {
  formatAmount,
  performanceStatusLabel,
} from "@/lib/performances";
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

export default async function PerformancesListPage() {
  const session = await auth();
  const userId = Number(session?.user?.id);
  const rows = Number.isFinite(userId)
    ? await db
        .select({
          id: performances.id,
          activityTypeName: activityTypes.name,
          performanceDate: performances.performanceDate,
          amount: performances.amount,
          status: performances.status,
          teamName: teams.name,
        })
        .from(performances)
        .leftJoin(teams, eq(performances.teamId, teams.id))
        .leftJoin(activityTypes, eq(activityTypes.id, performances.activityTypeId))
        .where(eq(performances.userId, userId))
        .orderBy(desc(performances.performanceDate), desc(performances.id))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Mijn prestaties
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {rows.length}{" "}
            {rows.length === 1 ? "prestatie" : "prestaties"} geregistreerd.
          </p>
        </div>
        <Link
          href="/trainer/prestaties/nieuw"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Nieuwe prestatie
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Nog geen prestaties. Klik op{" "}
          <span className="font-medium text-slate-700">Nieuwe prestatie</span>{" "}
          om er eentje te loggen.
        </div>
      ) : (
        <>
          {/* Desktop: tabel */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Ploeg</th>
                  <th className="px-4 py-3 text-right">Bedrag</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <PerformanceRow key={p.id} id={p.id}>
                    <td className="px-4 py-3 font-medium">
                      {formatDate(p.performanceDate)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.activityTypeName ?? "-"}
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
                performanceDate={p.performanceDate}
                activityTypeName={p.activityTypeName}
                amount={p.amount}
                status={p.status}
                teamName={p.teamName}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "open" | "sent" | "paid" }) {
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

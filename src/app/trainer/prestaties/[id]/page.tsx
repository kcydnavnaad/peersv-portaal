import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { performances, seasons, teams } from "@/db/schema";
import {
  formatAmount,
  performanceStatusLabel,
  performanceTypeLabel,
} from "@/lib/performances";
import { DeletePerformanceButton } from "../_components/delete-performance-button";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("nl-BE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function PerformanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfId = Number(id);
  if (!Number.isFinite(perfId)) notFound();

  const session = await auth();
  const userId = Number(session?.user?.id);

  const [perf] = await db
    .select({
      id: performances.id,
      userId: performances.userId,
      type: performances.type,
      performanceDate: performances.performanceDate,
      amount: performances.amount,
      notes: performances.notes,
      status: performances.status,
      paidAt: performances.paidAt,
      createdAt: performances.createdAt,
      updatedAt: performances.updatedAt,
      teamName: teams.name,
      seasonName: seasons.name,
    })
    .from(performances)
    .leftJoin(teams, eq(performances.teamId, teams.id))
    .leftJoin(seasons, eq(teams.seasonId, seasons.id))
    .where(eq(performances.id, perfId))
    .limit(1);

  if (!perf) notFound();
  if (Number.isFinite(userId) && perf.userId !== userId) notFound();

  const isOpen = perf.status === "open";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link
            href="/trainer/prestaties"
            className="text-sm text-slate-500 hover:underline"
          >
            ← Terug naar prestaties
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {performanceTypeLabel[perf.type]} ·{" "}
            {formatDate(perf.performanceDate)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {perf.teamName ?? "-"}
            {perf.seasonName ? ` · ${perf.seasonName}` : ""}
          </p>
        </div>
        {isOpen && (
          <div className="flex gap-2">
            <Link
              href={`/trainer/prestaties/${perf.id}/bewerken`}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Bewerken
            </Link>
            <DeletePerformanceButton id={perf.id} />
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <dl className="divide-y divide-slate-100 text-sm">
          <Row label="Datum" value={formatDate(perf.performanceDate)} />
          <Row label="Type" value={performanceTypeLabel[perf.type]} />
          <Row label="Ploeg" value={perf.teamName ?? "-"} />
          <Row label="Bedrag" value={formatAmount(perf.amount)} />
          <Row
            label="Status"
            value={
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  perf.status === "paid"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {performanceStatusLabel[perf.status]}
              </span>
            }
          />
          {perf.paidAt && (
            <Row
              label="Betaald op"
              value={perf.paidAt.toLocaleString("nl-BE")}
            />
          )}
          <Row label="Notities" value={perf.notes ?? "-"} />
          <Row
            label="Aangemaakt"
            value={perf.createdAt.toLocaleString("nl-BE")}
          />
          <Row
            label="Bijgewerkt"
            value={perf.updatedAt.toLocaleString("nl-BE")}
          />
        </dl>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 px-4 py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="col-span-2 text-slate-900">{value}</dd>
    </div>
  );
}

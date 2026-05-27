import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { performances, seasons, teams, users } from "@/db/schema";
import {
  formatAmount,
  performanceStatusLabel,
  performanceTypeLabel,
} from "@/lib/performances";
import { PaymentToggleButton } from "../_components/payment-toggle-button";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("nl-BE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const trainerUser = alias(users, "trainer_user");
const paidByUser = alias(users, "paid_by_user");

export default async function AdminPerformanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfId = Number(id);
  if (!Number.isFinite(perfId)) notFound();

  const [perf] = await db
    .select({
      id: performances.id,
      type: performances.type,
      performanceDate: performances.performanceDate,
      amount: performances.amount,
      notes: performances.notes,
      status: performances.status,
      paidAt: performances.paidAt,
      createdAt: performances.createdAt,
      updatedAt: performances.updatedAt,
      trainerName: sql<string>`${trainerUser.firstName} || ' ' || ${trainerUser.lastName}`,
      trainerEmail: trainerUser.email,
      teamName: teams.name,
      seasonName: seasons.name,
      paidByName: sql<
        string | null
      >`case when ${paidByUser.id} is null then null else ${paidByUser.firstName} || ' ' || ${paidByUser.lastName} end`,
    })
    .from(performances)
    .innerJoin(trainerUser, eq(trainerUser.id, performances.userId))
    .leftJoin(teams, eq(teams.id, performances.teamId))
    .leftJoin(seasons, eq(seasons.id, teams.seasonId))
    .leftJoin(paidByUser, eq(paidByUser.id, performances.paidBy))
    .where(eq(performances.id, perfId))
    .limit(1);

  if (!perf) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/admin/prestaties"
            className="text-sm text-slate-500 hover:underline"
          >
            ← Terug naar prestaties
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {performanceTypeLabel[perf.type]} ·{" "}
            {formatDate(perf.performanceDate)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {perf.trainerName} · {perf.teamName ?? "-"}
            {perf.seasonName ? ` · ${perf.seasonName}` : ""}
          </p>
        </div>
        <PaymentToggleButton
          id={perf.id}
          status={perf.status}
          variant="detail"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <dl className="divide-y divide-slate-100 text-sm">
          <Row
            label="Trainer"
            value={`${perf.trainerName} (${perf.trainerEmail})`}
          />
          <Row label="Datum" value={formatDate(perf.performanceDate)} />
          <Row label="Type" value={performanceTypeLabel[perf.type]} />
          <Row label="Ploeg" value={perf.teamName ?? "-"} />
          <Row label="Seizoen" value={perf.seasonName ?? "-"} />
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
          {perf.paidByName && (
            <Row label="Betaald door" value={perf.paidByName} />
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
    <div className="grid grid-cols-1 gap-1 px-4 py-3 md:grid-cols-3 md:gap-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900 md:col-span-2">{value}</dd>
    </div>
  );
}

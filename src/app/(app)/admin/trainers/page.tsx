import Link from "next/link";
import { and, asc, eq, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { formatIban, formatRate } from "@/lib/trainers";
import { actsAsTrainer } from "@/lib/users";
import { TrainerCard } from "./_components/trainer-card";
import { TrainerRow } from "./_components/trainer-row";

export const dynamic = "force-dynamic";

type ViewMode = "active" | "deactivated" | "all";

export default async function TrainersListPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const sp = await searchParams;
  const view: ViewMode =
    sp.view === "deactivated" || sp.view === "all" ? sp.view : "active";

  const baseFilter = actsAsTrainer();
  const filter =
    view === "active"
      ? and(baseFilter, isNull(users.deactivatedAt))
      : view === "deactivated"
        ? and(baseFilter, isNotNull(users.deactivatedAt))
        : baseFilter;

  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      trainerRate: users.trainerRate,
      isButterfly: users.isButterfly,
      iban: users.iban,
      deactivatedAt: users.deactivatedAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(filter)
    .orderBy(asc(users.lastName), asc(users.firstName));

  const labelMap: Record<ViewMode, string> = {
    active: "Actieve trainers",
    deactivated: "Gedeactiveerde trainers",
    all: "Alle trainers",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Trainers</h1>
          <p className="mt-1 text-sm text-slate-600">
            {rows.length}{" "}
            {rows.length === 1 ? "trainer" : "trainers"} ({labelMap[view].toLowerCase()}).
          </p>
        </div>
        <Link
          href="/admin/trainers/nieuw"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Nieuwe trainer
        </Link>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Toon:</span>
        <ViewLink current={view} target="active" label="Actief" />
        <ViewLink current={view} target="deactivated" label="Gedeactiveerd" />
        <ViewLink current={view} target="all" label="Alles" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          {view === "active"
            ? "Geen actieve trainers."
            : view === "deactivated"
              ? "Geen gedeactiveerde trainers."
              : "Nog geen trainers."}
        </div>
      ) : (
        <>
          {/* Desktop: tabel */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Naam</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3 text-right">Tarief</th>
                  <th className="px-4 py-3">Vlinder</th>
                  <th className="px-4 py-3">IBAN</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Laatst ingelogd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((t) => {
                  const isDeactivated = t.deactivatedAt !== null;
                  const rowClass = isDeactivated ? "opacity-60" : "";
                  return (
                    <TrainerRow key={t.id} id={t.id}>
                      <td className={`px-4 py-3 font-medium ${rowClass}`}>
                        {t.firstName} {t.lastName}
                      </td>
                      <td className={`px-4 py-3 text-slate-600 ${rowClass}`}>
                        {t.email}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums text-slate-700 ${rowClass}`}>
                        {formatRate(t.trainerRate)}
                      </td>
                      <td className={`px-4 py-3 ${rowClass}`}>
                        {t.isButterfly ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                            Vlinder
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-slate-600 tabular-nums ${rowClass}`}>
                        {formatIban(t.iban)}
                      </td>
                      <td className="px-4 py-3">
                        {isDeactivated ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                            Gedeactiveerd
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                            Actief
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-slate-600 text-xs ${rowClass}`}>
                        {t.lastLoginAt
                          ? new Date(t.lastLoginAt).toLocaleString("nl-BE", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </TrainerRow>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {rows.map((t) => (
              <TrainerCard
                key={t.id}
                id={t.id}
                firstName={t.firstName}
                lastName={t.lastName}
                email={t.email}
                trainerRate={t.trainerRate}
                isButterfly={t.isButterfly}
                iban={t.iban}
                isDeactivated={t.deactivatedAt !== null}
                lastLoginAt={t.lastLoginAt}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ViewLink({
  current,
  target,
  label,
}: {
  current: ViewMode;
  target: ViewMode;
  label: string;
}) {
  const active = current === target;
  const href = target === "active" ? "/admin/trainers" : `/admin/trainers?view=${target}`;
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white"
          : "rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
      }
    >
      {label}
    </Link>
  );
}
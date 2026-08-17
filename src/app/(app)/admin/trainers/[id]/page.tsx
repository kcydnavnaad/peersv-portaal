import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  activityTypes,
  trainerActivityAccess,
  trainerRateOverrides,
  users,
} from "@/db/schema";
import { formatIban, formatRate } from "@/lib/trainers";
import { actsAsTrainer } from "@/lib/users";
import { ActivityAccessRow } from "../_components/activity-access-row";
import { AdminResetMfaButton } from "../_components/AdminResetMfaButton";
import { ResetPasswordButton } from "../_components/ResetPasswordButton";
import { ToggleActivationButton } from "../_components/ToggleActivationButton";

export const dynamic = "force-dynamic";

export default async function TrainerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; invited?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const justCreated = sp.created === "1";
  const justInvited = sp.invited === "1";
  const userId = Number(id);
  if (!Number.isFinite(userId)) notFound();

  const [trainer] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), actsAsTrainer()))
    .limit(1);

  if (!trainer) notFound();

  const fullName = `${trainer.firstName} ${trainer.lastName}`;
  const isDeactivated = trainer.deactivatedAt !== null;

  const activityRows = await db
    .select({
      id: activityTypes.id,
      name: activityTypes.name,
      isDefaultVisible: activityTypes.isDefaultVisible,
      hasAccessId: trainerActivityAccess.id,
      overrideRate: trainerRateOverrides.rate,
    })
    .from(activityTypes)
    .leftJoin(
      trainerActivityAccess,
      and(
        eq(trainerActivityAccess.activityTypeId, activityTypes.id),
        eq(trainerActivityAccess.userId, trainer.id),
      ),
    )
    .leftJoin(
      trainerRateOverrides,
      and(
        eq(trainerRateOverrides.activityTypeId, activityTypes.id),
        eq(trainerRateOverrides.userId, trainer.id),
      ),
    )
    .orderBy(asc(activityTypes.id));

  const nonDefaultActivities = activityRows.filter((a) => !a.isDefaultVisible);

  return (
    <div className="space-y-6">
      {justCreated && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {justInvited
            ? "Trainer aangemaakt. Een uitnodigingsemail is verstuurd."
            : "Trainer aangemaakt. Vergeet niet het initiële wachtwoord door te geven aan de trainer."}
        </div>
      )}
      {isDeactivated && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Deze trainer is gedeactiveerd en kan niet inloggen. Historische
          prestaties en koppelingen blijven bewaard.
        </div>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/admin/trainers"
            className="text-sm text-slate-500 hover:underline"
          >
            ← Terug naar trainers
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {fullName}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            {trainer.isButterfly && (
              <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">
                Vlinder
              </span>
            )}
            {isDeactivated && (
              <span className="inline-block rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700">
                Gedeactiveerd
              </span>
            )}
            {trainer.mfaEnabled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                MFA actief
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ToggleActivationButton
            trainerId={trainer.id}
            trainerName={fullName}
            isDeactivated={isDeactivated}
          />
          <ResetPasswordButton trainerId={trainer.id} trainerName={fullName} />
          {trainer.mfaEnabled && (
            <AdminResetMfaButton
              trainerId={trainer.id}
              trainerName={fullName}
            />
          )}
          <Link
            href={`/admin/trainers/${trainer.id}/bewerken`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Bewerken
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <dl className="divide-y divide-slate-100 text-sm">
          <Row label="Voornaam" value={trainer.firstName} />
          <Row label="Achternaam" value={trainer.lastName} />
          <Row label="E-mail" value={trainer.email} />
          <Row label="Telefoon" value={trainer.phone ?? "—"} />
          <Row label="Tarief" value={formatRate(trainer.trainerRate)} />
          <Row label="Vlinder" value={trainer.isButterfly ? "Ja" : "Nee"} />
          <Row label="IBAN" value={formatIban(trainer.iban)} />
          <Row
            label="Status"
            value={
              isDeactivated
                ? `Gedeactiveerd op ${trainer.deactivatedAt!.toLocaleString("nl-BE")}`
                : "Actief"
            }
          />
          <Row
            label="Aangemaakt"
            value={trainer.createdAt.toLocaleString("nl-BE")}
          />
          <Row
            label="Bijgewerkt"
            value={trainer.updatedAt.toLocaleString("nl-BE")}
          />
        </dl>
      </div>

      {nonDefaultActivities.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Activity access &amp; tarief</h2>
          <p className="mt-1 text-sm text-slate-600">
            Vink activiteiten aan die deze trainer mag loggen. Leeg tarief =
            standaard tarief van de trainer wordt gebruikt.
          </p>
          <div className="mt-4">
            {nonDefaultActivities.map((a) => (
              <ActivityAccessRow
                key={a.id}
                trainerId={trainer.id}
                activityTypeId={a.id}
                activityName={a.name}
                initialHasAccess={a.hasAccessId !== null}
                initialRate={a.overrideRate}
              />
            ))}
          </div>
        </section>
      )}
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
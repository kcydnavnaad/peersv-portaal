import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { formatIban, formatRate } from "@/lib/trainers";

export const dynamic = "force-dynamic";

export default async function TrainerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const justCreated = sp.created === "1";
  const userId = Number(id);
  if (!Number.isFinite(userId)) notFound();

  const [trainer] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.role, "trainer")))
    .limit(1);

  if (!trainer) notFound();

  const fullName = `${trainer.firstName} ${trainer.lastName}`;

  return (
    <div className="space-y-6">
      {justCreated && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Trainer aangemaakt. Vergeet niet het initiële wachtwoord door te geven
          aan de trainer.
        </div>
      )}
      <div className="flex items-end justify-between gap-4">
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
          {trainer.isButterfly && (
            <span className="mt-2 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">
              Vlinder
            </span>
          )}
        </div>
        <Link
          href={`/admin/trainers/${trainer.id}/bewerken`}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Bewerken
        </Link>
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
            label="Aangemaakt"
            value={trainer.createdAt.toLocaleString("nl-BE")}
          />
          <Row
            label="Bijgewerkt"
            value={trainer.updatedAt.toLocaleString("nl-BE")}
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

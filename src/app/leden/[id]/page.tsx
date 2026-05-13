import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { DeleteMemberButton } from "../_components/delete-member-button";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  active: "Actief",
  inactive: "Inactief",
  pending: "In aanvraag",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("nl-BE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isFinite(memberId)) notFound();

  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!member) notFound();

  const fullName = `${member.firstName} ${member.lastName}`;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link
            href="/leden"
            className="text-sm text-slate-500 hover:underline"
          >
            ← Terug naar leden
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {fullName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Lid sinds {formatDate(member.joinedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/leden/${member.id}/bewerken`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Bewerken
          </Link>
          <DeleteMemberButton id={member.id} label={fullName} />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <dl className="divide-y divide-slate-100 text-sm">
          <Row label="Voornaam" value={member.firstName} />
          <Row label="Achternaam" value={member.lastName} />
          <Row label="E-mail" value={member.email ?? "-"} />
          <Row label="Telefoon" value={member.phone ?? "-"} />
          <Row label="Geboortedatum" value={formatDate(member.birthDate)} />
          <Row label="Ploeg" value={member.team ?? "-"} />
          <Row
            label="Status"
            value={
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {statusLabel[member.status] ?? member.status}
              </span>
            }
          />
          <Row label="Aangemaakt" value={member.createdAt.toLocaleString("nl-BE")} />
          <Row label="Bijgewerkt" value={member.updatedAt.toLocaleString("nl-BE")} />
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

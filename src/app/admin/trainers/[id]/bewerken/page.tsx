import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { updateTrainer } from "@/app/actions/trainers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { actsAsTrainer } from "@/lib/users";
import { TrainerForm } from "../../_components/trainer-form";

export const dynamic = "force-dynamic";

export default async function EditTrainerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) notFound();

  const [trainer] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), actsAsTrainer()))
    .limit(1);

  if (!trainer) notFound();

  const boundAction = updateTrainer.bind(null, trainer.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/trainers/${trainer.id}`}
          className="text-sm text-slate-500 hover:underline"
        >
          ← Terug naar {trainer.firstName} {trainer.lastName}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Trainer bewerken
        </h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <TrainerForm
          action={boundAction}
          defaults={{
            firstName: trainer.firstName,
            lastName: trainer.lastName,
            email: trainer.email,
            phone: trainer.phone,
            trainerRate: trainer.trainerRate,
            isButterfly: trainer.isButterfly,
            iban: trainer.iban,
          }}
          submitLabel="Opslaan"
          cancelHref={`/admin/trainers/${trainer.id}`}
        />
      </div>
    </div>
  );
}

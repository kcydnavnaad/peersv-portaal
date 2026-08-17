import Link from "next/link";
import { createTrainer } from "@/app/actions/trainers";
import { TrainerForm } from "../_components/trainer-form";

export default function NewTrainerPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/trainers"
          className="text-sm text-slate-500 hover:underline"
        >
          ← Terug naar trainers
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Nieuwe trainer
        </h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <TrainerForm
          action={createTrainer}
          defaults={{
            firstName: "",
            lastName: "",
            email: "",
            phone: null,
            trainerRate: null,
            isButterfly: false,
            iban: null,
          }}
          submitLabel="Aanmaken"
          cancelHref="/admin/trainers"
          includePassword
        />
      </div>
    </div>
  );
}

import Link from "next/link";
import { createMember } from "@/app/actions/members";
import { MemberForm } from "../_components/member-form";

export default function NewMemberPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/leden"
          className="text-sm text-slate-500 hover:underline"
        >
          ← Terug naar leden
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Nieuw lid
        </h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <MemberForm
          action={createMember}
          submitLabel="Toevoegen"
          cancelHref="/leden"
        />
      </div>
    </div>
  );
}

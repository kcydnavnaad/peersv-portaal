"use client";

import { useActionState, useState } from "react";
import { adminResetMfa } from "@/app/actions/mfa";

type Props = {
  trainerId: number;
  trainerName: string;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export function AdminResetMfaButton({ trainerId, trainerName }: Props) {
  const [open, setOpen] = useState(false);
  const boundAction = adminResetMfa.bind(null, trainerId);
  const [state, action, pending] = useActionState(boundAction, {});

  if (state.ok) {
    if (typeof window !== "undefined") {
      setTimeout(() => window.location.reload(), 500);
    }
    return (
      <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        MFA gereset voor {trainerName}. Pagina wordt herladen...
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
      >
        MFA resetten
      </button>
    );
  }

  return (
    <form
      action={action}
      className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4"
    >
      <h3 className="text-sm font-medium">
        MFA resetten voor {trainerName}
      </h3>
      <p className="text-xs text-slate-600">
        Hiermee schakel je MFA voor deze gebruiker uit. Zij kunnen daarna
        inloggen zonder MFA-code, en moeten zelf opnieuw instellen.
      </p>

      <div>
        <label className="block text-xs font-medium text-slate-700">
          Je eigen wachtwoord ter bevestiging
        </label>
        <input
          name="adminPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputCls}
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {pending ? "Bezig..." : "MFA resetten"}
        </button>
      </div>
    </form>
  );
}

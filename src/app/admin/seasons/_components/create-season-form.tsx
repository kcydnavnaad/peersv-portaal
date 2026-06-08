"use client";

import { useActionState } from "react";
import { createSeason, type SeasonActionState } from "@/app/actions/seasons";

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export function CreateSeasonForm() {
  const [state, action, pending] = useActionState<SeasonActionState, FormData>(
    createSeason,
    {},
  );

  if (state.ok) {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
    return (
      <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        Seizoen aangemaakt. Pagina wordt herladen...
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-700"
          >
            Naam
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="2026-2027"
            className={inputCls}
          />
        </div>
        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-slate-700"
          >
            Startdatum
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label
            htmlFor="endDate"
            className="block text-sm font-medium text-slate-700"
          >
            Einddatum
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            className={inputCls}
          />
        </div>
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Bezig..." : "Aanmaken"}
      </button>
    </form>
  );
}

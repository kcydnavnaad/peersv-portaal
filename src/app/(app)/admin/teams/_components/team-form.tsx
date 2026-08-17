"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { TeamFormState } from "@/lib/teams";

type SeasonOption = {
  id: number;
  name: string;
  isActive: boolean;
};

type Props = {
  action: (state: TeamFormState, fd: FormData) => Promise<TeamFormState>;
  seasons: SeasonOption[];
  defaults?: {
    name?: string;
    category?: string | null;
    seasonId?: number;
  };
  submitLabel: string;
  cancelHref: string;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

const labelCls = "block text-sm font-medium text-slate-700";
const errorCls = "mt-1 text-xs text-red-600";

export function TeamForm({
  action,
  seasons,
  defaults,
  submitLabel,
  cancelHref,
}: Props) {
  const [state, formAction, isPending] = useActionState<TeamFormState, FormData>(
    action,
    {},
  );

  const v = (key: string, fallback?: string) =>
    state.values?.[key] ?? fallback ?? "";

  const defaultSeason =
    state.values?.seasonId ??
    (defaults?.seasonId
      ? String(defaults.seasonId)
      : String(seasons.find((s) => s.isActive)?.id ?? seasons[0]?.id ?? ""));

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className={labelCls}>
          Naam *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={v("name", defaults?.name)}
          className={inputCls}
        />
        {state.errors?.name && <p className={errorCls}>{state.errors.name}</p>}
      </div>

      <div>
        <label htmlFor="category" className={labelCls}>
          Categorie
        </label>
        <input
          id="category"
          name="category"
          type="text"
          defaultValue={v("category", defaults?.category ?? "")}
          className={inputCls}
          placeholder="Bijv. Jeugd, Senioren, Dames"
        />
        {state.errors?.category && (
          <p className={errorCls}>{state.errors.category}</p>
        )}
      </div>

      <div>
        <label htmlFor="seasonId" className={labelCls}>
          Seizoen *
        </label>
        <select
          id="seasonId"
          name="seasonId"
          required
          defaultValue={defaultSeason}
          className={inputCls}
        >
          {seasons.length === 0 && <option value="">Geen seizoenen</option>}
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.isActive ? " (actief)" : ""}
            </option>
          ))}
        </select>
        {state.errors?.seasonId && (
          <p className={errorCls}>{state.errors.seasonId}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
        <Link
          href={cancelHref}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          Annuleren
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? "Bezig..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

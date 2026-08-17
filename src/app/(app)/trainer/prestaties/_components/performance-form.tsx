"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  formatAmount,
  type PerformanceFormState,
} from "@/lib/performances";
import type { ActivityTypeOption } from "@/lib/activity-types";

type TeamOption = {
  id: number;
  name: string;
  seasonName: string | null;
};

type Props = {
  action: (
    state: PerformanceFormState,
    fd: FormData,
  ) => Promise<PerformanceFormState>;
  teamOptions: TeamOption[];
  activityTypes: ActivityTypeOption[];
  rate: string | null;
  defaults?: {
    activityTypeId?: number;
    performanceDate?: string;
    team?: number;
    notes?: string | null;
  };
  submitLabel: string;
  cancelHref: string;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelCls = "block text-sm font-medium text-slate-700";
const errorCls = "mt-1 text-xs text-red-600";

export function PerformanceForm({
  action,
  teamOptions,
  activityTypes,
  rate,
  defaults,
  submitLabel,
  cancelHref,
}: Props) {
  const [state, formAction, isPending] = useActionState<
    PerformanceFormState,
    FormData
  >(action, {});

  const v = (key: string, fallback?: string) =>
    state.values?.[key] ?? fallback ?? "";

  const initialActivityId = (() => {
    const raw = state.values?.activityTypeId;
    if (raw) return Number(raw);
    if (defaults?.activityTypeId != null) return defaults.activityTypeId;
    return (
      activityTypes.find((a) => a.isDefault)?.id ??
      activityTypes[0]?.id ??
      0
    );
  })();

  const [selectedActivityId, setSelectedActivityId] =
    useState<number>(initialActivityId);

  const selectedActivity = activityTypes.find(
    (a) => a.id === selectedActivityId,
  );
  const requiresTeam = selectedActivity?.requiresTeam ?? true;

  const defaultTeam =
    state.values?.team ??
    (defaults?.team ? String(defaults.team) : String(teamOptions[0]?.id ?? ""));

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {rate
          ? `Tarief: ${formatAmount(rate)} wordt automatisch gebruikt.`
          : "Geen tarief ingesteld op je profiel. Vraag een admin om dit in te stellen voor je een prestatie kan loggen."}
      </div>

      {state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="activityTypeId" className={labelCls}>
          Type *
        </label>
        <select
          id="activityTypeId"
          name="activityTypeId"
          required
          value={selectedActivityId ? String(selectedActivityId) : ""}
          onChange={(e) => setSelectedActivityId(Number(e.target.value))}
          className={inputCls}
        >
          {activityTypes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {state.errors?.activityTypeId && (
          <p className={errorCls}>{state.errors.activityTypeId}</p>
        )}
      </div>

      <div>
        <label htmlFor="performanceDate" className={labelCls}>
          Datum *
        </label>
        <input
          id="performanceDate"
          name="performanceDate"
          type="date"
          required
          defaultValue={v("performanceDate", defaults?.performanceDate)}
          className={inputCls}
        />
        {state.errors?.performanceDate && (
          <p className={errorCls}>{state.errors.performanceDate}</p>
        )}
      </div>

      {requiresTeam && (
        <div>
          <label htmlFor="team" className={labelCls}>
            Ploeg *
          </label>
          <select
            id="team"
            name="team"
            required
            defaultValue={defaultTeam}
            className={inputCls}
          >
            {teamOptions.length === 0 && (
              <option value="">Geen ploegen beschikbaar</option>
            )}
            {teamOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.seasonName ? ` (${t.seasonName})` : ""}
              </option>
            ))}
          </select>
          {state.errors?.team && (
            <p className={errorCls}>{state.errors.team}</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="notes" className={labelCls}>
          Notities
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={v("notes", defaults?.notes ?? "")}
          className={inputCls}
        />
        {state.errors?.notes && (
          <p className={errorCls}>{state.errors.notes}</p>
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
          disabled={
            isPending || (requiresTeam && teamOptions.length === 0) || !rate
          }
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? "Bezig..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

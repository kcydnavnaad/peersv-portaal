"use client";

import { useState, useTransition } from "react";
import { setTrainerActivityAccess } from "@/app/actions/trainer-activity-access";

type Props = {
  trainerId: number;
  activityTypeId: number;
  activityName: string;
  initialHasAccess: boolean;
  initialRate: string | null;
};

const inputCls =
  "w-32 rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export function ActivityAccessRow({
  trainerId,
  activityTypeId,
  activityName,
  initialHasAccess,
  initialRate,
}: Props) {
  const [hasAccess, setHasAccess] = useState(initialHasAccess);
  const [rate, setRate] = useState(initialRate ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setTrainerActivityAccess(
        trainerId,
        activityTypeId,
        hasAccess,
        rate,
      );
      if (!result.ok) {
        setError(result.error ?? "Opslaan mislukt.");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <label className="flex min-w-[180px] flex-1 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={hasAccess}
          onChange={(e) => setHasAccess(e.target.checked)}
          className="size-4 rounded border-slate-300"
        />
        <span className="font-medium">{activityName}</span>
      </label>
      <div className="flex items-center gap-1 text-sm">
        <span className="text-slate-500">Tarief €</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="—"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className={inputCls}
        />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "..." : saved ? "✓" : "Opslaan"}
      </button>
      {error && (
        <p className="w-full text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}

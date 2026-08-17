"use client";

import { useActionState } from "react";
import type { SettingsFormState } from "@/lib/settings";

type Props = {
  action: (
    state: SettingsFormState,
    fd: FormData,
  ) => Promise<SettingsFormState>;
  defaults: {
    paymentCapYear: string;
  };
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelCls = "block text-sm font-medium text-slate-700";
const errorCls = "mt-1 text-xs text-red-600";

export function SettingsForm({ action, defaults }: Props) {
  const [state, formAction, isPending] = useActionState<
    SettingsFormState,
    FormData
  >(action, {});

  const v = (key: string, fallback?: string) =>
    state.values?.[key] ?? fallback ?? "";

  return (
    <form action={formAction} className="space-y-4">
      {state.success && state.message && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.message}
        </p>
      )}
      {!state.success && state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="paymentCapYear" className={labelCls}>
          Jaarplafond per trainer (€)
        </label>
        <input
          id="paymentCapYear"
          name="paymentCapYear"
          type="text"
          inputMode="decimal"
          required
          defaultValue={v("paymentCapYear", defaults.paymentCapYear)}
          className={inputCls}
        />
        <p className="mt-1 text-xs text-slate-500">
          Wettelijk maximum voor onbelaste vrijwilligersvergoeding. Wijzig dit
          jaarlijks volgens de geldende fiscale regels.
        </p>
        {state.errors?.paymentCapYear && (
          <p className={errorCls}>{state.errors.paymentCapYear}</p>
        )}
      </div>

      <div className="flex items-center justify-end border-t border-slate-200 pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? "Bezig..." : "Opslaan"}
        </button>
      </div>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { TrainerFormState } from "@/lib/trainers";

type Props = {
  action: (
    state: TrainerFormState,
    fd: FormData,
  ) => Promise<TrainerFormState>;
  defaults: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    trainerRate: string | null;
    isButterfly: boolean;
    iban: string | null;
  };
  submitLabel: string;
  cancelHref: string;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelCls = "block text-sm font-medium text-slate-700";
const errorCls = "mt-1 text-xs text-red-600";

export function TrainerForm({
  action,
  defaults,
  submitLabel,
  cancelHref,
}: Props) {
  const [state, formAction, isPending] = useActionState<
    TrainerFormState,
    FormData
  >(action, {});

  const v = (key: string, fallback?: string | null) =>
    state.values?.[key] ?? fallback ?? "";

  const butterflyChecked =
    state.values?.isButterfly !== undefined
      ? state.values.isButterfly === "on"
      : defaults.isButterfly;

  return (
    <form action={formAction} className="space-y-4">
      {state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelCls}>
            Voornaam *
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            defaultValue={v("firstName", defaults.firstName)}
            className={inputCls}
          />
          {state.errors?.firstName && (
            <p className={errorCls}>{state.errors.firstName}</p>
          )}
        </div>
        <div>
          <label htmlFor="lastName" className={labelCls}>
            Achternaam *
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            defaultValue={v("lastName", defaults.lastName)}
            className={inputCls}
          />
          {state.errors?.lastName && (
            <p className={errorCls}>{state.errors.lastName}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelCls}>
            E-mail *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={v("email", defaults.email)}
            className={inputCls}
          />
          {state.errors?.email && (
            <p className={errorCls}>{state.errors.email}</p>
          )}
        </div>
        <div>
          <label htmlFor="phone" className={labelCls}>
            Telefoon
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={v("phone", defaults.phone)}
            className={inputCls}
          />
          {state.errors?.phone && (
            <p className={errorCls}>{state.errors.phone}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="trainerRate" className={labelCls}>
            Tarief (€)
          </label>
          <input
            id="trainerRate"
            name="trainerRate"
            type="text"
            inputMode="decimal"
            placeholder="25,00"
            defaultValue={v("trainerRate", defaults.trainerRate)}
            className={inputCls}
          />
          {state.errors?.trainerRate && (
            <p className={errorCls}>{state.errors.trainerRate}</p>
          )}
        </div>
        <div>
          <label htmlFor="iban" className={labelCls}>
            IBAN
          </label>
          <input
            id="iban"
            name="iban"
            type="text"
            placeholder="BE68 5390 0754 7034"
            defaultValue={v("iban", defaults.iban)}
            className={inputCls}
          />
          {state.errors?.iban && (
            <p className={errorCls}>{state.errors.iban}</p>
          )}
        </div>
      </div>

      <div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="isButterfly"
            defaultChecked={butterflyChecked}
            className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
          />
          <span>Is vlinder (mag voor alle teams prestaties loggen)</span>
        </label>
        {state.errors?.isButterfly && (
          <p className={errorCls}>{state.errors.isButterfly}</p>
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

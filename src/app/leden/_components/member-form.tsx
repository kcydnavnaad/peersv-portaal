"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { MemberFormState } from "@/lib/members";

type Props = {
  action: (state: MemberFormState, fd: FormData) => Promise<MemberFormState>;
  defaults?: {
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
    birthDate?: string | null;
    team?: string | null;
    status?: "active" | "inactive" | "pending";
  };
  submitLabel: string;
  cancelHref: string;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

const labelCls = "block text-sm font-medium text-slate-700";
const errorCls = "mt-1 text-xs text-red-600";

export function MemberForm({ action, defaults, submitLabel, cancelHref }: Props) {
  const [state, formAction, isPending] = useActionState<MemberFormState, FormData>(
    action,
    {},
  );

  const v = (key: string, fallback?: string | null) =>
    state.values?.[key] ?? fallback ?? "";

  return (
    <form action={formAction} className="space-y-4">
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
            defaultValue={v("firstName", defaults?.firstName)}
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
            defaultValue={v("lastName", defaults?.lastName)}
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
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={v("email", defaults?.email)}
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
            defaultValue={v("phone", defaults?.phone)}
            className={inputCls}
          />
          {state.errors?.phone && (
            <p className={errorCls}>{state.errors.phone}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="birthDate" className={labelCls}>
            Geboortedatum
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={v("birthDate", defaults?.birthDate)}
            className={inputCls}
          />
          {state.errors?.birthDate && (
            <p className={errorCls}>{state.errors.birthDate}</p>
          )}
        </div>
        <div>
          <label htmlFor="team" className={labelCls}>
            Ploeg
          </label>
          <input
            id="team"
            name="team"
            type="text"
            defaultValue={v("team", defaults?.team)}
            className={inputCls}
          />
          {state.errors?.team && (
            <p className={errorCls}>{state.errors.team}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="status" className={labelCls}>
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={v("status", defaults?.status ?? "active")}
          className={inputCls}
        >
          <option value="active">Actief</option>
          <option value="inactive">Inactief</option>
          <option value="pending">In aanvraag</option>
        </select>
        {state.errors?.status && (
          <p className={errorCls}>{state.errors.status}</p>
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

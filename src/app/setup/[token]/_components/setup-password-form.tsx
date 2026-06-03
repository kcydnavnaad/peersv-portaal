"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/lib/auth-forms";

type Props = {
  token: string;
  action: (
    token: string,
    state: AuthFormState,
    fd: FormData,
  ) => Promise<AuthFormState>;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelCls = "block text-sm font-medium text-slate-700";
const errorCls = "mt-1 text-xs text-red-600";

export function SetupPasswordForm({ token, action }: Props) {
  const boundAction = action.bind(null, token);
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(
    boundAction,
    {},
  );

  if (state.success && state.message) {
    return (
      <div className="space-y-3">
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.message}
        </p>
        <Link
          href="/login"
          className="block rounded-md bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
        >
          Naar inloggen
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.errors?._form && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.errors._form}
        </p>
      )}

      <div>
        <label htmlFor="password" className={labelCls}>
          Wachtwoord *
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className={inputCls}
          autoComplete="new-password"
        />
        <p className="mt-1 text-xs text-slate-500">Minstens 8 karakters.</p>
        {state.errors?.password && (
          <p className={errorCls}>{state.errors.password}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className={labelCls}>
          Bevestig wachtwoord *
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          className={inputCls}
          autoComplete="new-password"
        />
        {state.errors?.confirmPassword && (
          <p className={errorCls}>{state.errors.confirmPassword}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {isPending ? "Bezig..." : "Wachtwoord instellen en inloggen"}
      </button>
    </form>
  );
}

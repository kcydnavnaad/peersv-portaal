"use client";

import { useActionState } from "react";
import type { AuthFormState } from "@/lib/auth-forms";

type Props = {
  action: (state: AuthFormState, fd: FormData) => Promise<AuthFormState>;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelCls = "block text-sm font-medium text-slate-700";
const errorCls = "mt-1 text-xs text-red-600";

export function ForgotPasswordForm({ action }: Props) {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(
    action,
    {},
  );

  if (state.success && state.message) {
    return (
      <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className={labelCls}>
          E-mail *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={state.values?.email ?? ""}
          className={inputCls}
          autoComplete="email"
        />
        {state.errors?.email && (
          <p className={errorCls}>{state.errors.email}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {isPending ? "Versturen..." : "Verstuur reset-link"}
      </button>
    </form>
  );
}

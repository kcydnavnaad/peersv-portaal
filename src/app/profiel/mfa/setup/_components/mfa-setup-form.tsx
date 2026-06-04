"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  error?: string;
  recoveryCodes?: string[];
};

type Props = {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
};

export function MfaSetupForm({ action }: Props) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(
    action,
    {},
  );
  const router = useRouter();

  useEffect(() => {
    if (state.recoveryCodes && state.recoveryCodes.length > 0) {
      sessionStorage.setItem(
        "mfa-recovery-codes",
        JSON.stringify(state.recoveryCodes),
      );
      router.push("/profiel/mfa/recovery-codes");
    }
  }, [state.recoveryCodes, router]);

  return (
    <form action={formAction} className="mt-2 space-y-3">
      <div>
        <input
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="123 456"
          className="w-40 rounded-md border border-slate-300 px-3 py-2 text-lg font-mono tracking-widest shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          required
        />
      </div>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {isPending ? "Bezig..." : "Activeer tweefactor"}
      </button>
    </form>
  );
}

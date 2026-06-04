"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { authenticate, type AuthenticateResult } from "@/app/actions/auth";

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<
    AuthenticateResult | undefined,
    FormData
  >(authenticate, undefined);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const stage = state?.ok === false ? state.stage : "credentials";
  const isOnMfaStage = stage === "mfa";

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={isOnMfaStage}
          className={`${inputCls} ${isOnMfaStage ? "bg-slate-50" : ""}`}
        />
      </div>

      <div className={isOnMfaStage ? "hidden" : ""}>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Wachtwoord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required={!isOnMfaStage}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
      </div>

      {isOnMfaStage && (
        <input type="hidden" name="password" value={password} />
      )}

      {isOnMfaStage && (
        <div>
          <label htmlFor="mfaCode" className="block text-sm font-medium text-slate-700">
            Tweefactor code
          </label>
          <input
            id="mfaCode"
            name="mfaCode"
            type="text"
            inputMode="text"
            autoComplete="one-time-code"
            autoFocus
            required
            placeholder="123 456 of XXXX-XXXX"
            className={`${inputCls} font-mono tracking-widest`}
          />
          <p className="mt-1 text-xs text-slate-500">
            Voer de 6-cijferige code uit je authenticator app in, of een herstelcode (XXXX-XXXX).
          </p>
        </div>
      )}

      {state?.ok === false && state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {isPending ? "Bezig..." : isOnMfaStage ? "Verifieer" : "Inloggen"}
      </button>

      {!isOnMfaStage && (
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-slate-600 hover:underline">
            Wachtwoord vergeten?
          </Link>
        </p>
      )}
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { authenticate, type AuthenticateResult } from "@/app/actions/auth";

const labelCls =
  "block text-[13px] font-medium text-[color:var(--color-text)]";
const inputCls =
  "mt-1 block w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border)] bg-white px-3 py-2.5 text-sm text-[color:var(--color-text)] shadow-[var(--shadow-sm)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/20";

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
        <label htmlFor="email" className={labelCls}>
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
          className={`${inputCls} ${isOnMfaStage ? "bg-[color:var(--color-bg)]" : ""}`}
        />
      </div>

      <div className={isOnMfaStage ? "hidden" : ""}>
        <label htmlFor="password" className={labelCls}>
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
          <label htmlFor="mfaCode" className={labelCls}>
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
          <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
            Voer de 6-cijferige code uit je authenticator app in, of een herstelcode (XXXX-XXXX).
          </p>
        </div>
      )}

      {state?.ok === false && state.error && (
        <p className="rounded-[var(--radius-sm)] bg-[color:var(--color-danger)]/10 px-3 py-2 text-sm text-[color:var(--color-danger)]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-[var(--radius-sm)] bg-[color:var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-sm)] hover:bg-[color:var(--color-primary-hover)] disabled:opacity-50"
      >
        {isPending ? "Bezig..." : isOnMfaStage ? "Verifieer" : "Inloggen"}
      </button>

      {!isOnMfaStage && (
        <p className="text-center text-sm">
          <Link
            href="/forgot-password"
            className="text-[color:var(--color-text-muted)] hover:text-[color:var(--color-primary)] hover:underline"
          >
            Wachtwoord vergeten?
          </Link>
        </p>
      )}
    </form>
  );
}

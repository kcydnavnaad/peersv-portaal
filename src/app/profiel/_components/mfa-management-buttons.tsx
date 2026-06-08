"use client";

import { useActionState, useState } from "react";
import { disableMfa, regenerateRecoveryCodes } from "@/app/actions/mfa";

type Props = {
  recoveryCodesAvailable: number;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const btnPrimary =
  "rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50";
const btnSecondary =
  "rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const btnDanger =
  "rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50";

type Mode = "idle" | "disable" | "regenerate";

export function MfaManagementButtons(_props: Props) {
  const [mode, setMode] = useState<Mode>("idle");

  const [disableState, disableAction, disablePending] = useActionState(
    disableMfa,
    {},
  );
  const [regenState, regenAction, regenPending] = useActionState(
    regenerateRecoveryCodes,
    {},
  );

  if (disableState.ok) {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
    return null;
  }

  if (regenState.ok && regenState.recoveryCodes) {
    return (
      <div className="space-y-3 rounded-md bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">
          Je nieuwe herstelcodes. Bewaar ze veilig — dit is de enige keer dat ze
          getoond worden.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-md bg-white p-3 font-mono text-sm">
          {regenState.recoveryCodes.map((code, i) => (
            <div key={i}>{code}</div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (regenState.recoveryCodes) {
                navigator.clipboard.writeText(
                  regenState.recoveryCodes.join("\n"),
                );
              }
            }}
            className={btnSecondary}
          >
            Kopieer
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={btnPrimary}
          >
            Klaar
          </button>
        </div>
      </div>
    );
  }

  if (mode === "idle") {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("regenerate")}
          className={btnSecondary}
        >
          Nieuwe herstelcodes genereren
        </button>
        <button
          type="button"
          onClick={() => setMode("disable")}
          className={btnDanger}
        >
          Tweefactor uitschakelen
        </button>
      </div>
    );
  }

  const isDisable = mode === "disable";
  const action = isDisable ? disableAction : regenAction;
  const pending = isDisable ? disablePending : regenPending;
  const error = isDisable ? disableState.error : regenState.error;
  const title = isDisable
    ? "Tweefactor uitschakelen"
    : "Nieuwe herstelcodes genereren";
  const description = isDisable
    ? "Hierdoor wordt MFA uitgeschakeld en alle herstelcodes verwijderd. Je kan hem later opnieuw instellen."
    : "Je oude herstelcodes worden ongeldig. Er worden 10 nieuwe codes gegenereerd.";
  const submitLabel = isDisable ? "Uitschakelen" : "Genereer nieuwe codes";

  return (
    <form
      action={action}
      className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4"
    >
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-slate-600">{description}</p>

      <div>
        <label
          htmlFor="currentPassword"
          className="block text-xs font-medium text-slate-700"
        >
          Huidig wachtwoord
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputCls}
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("idle")}
          className={btnSecondary}
        >
          Annuleren
        </button>
        <button
          type="submit"
          disabled={pending}
          className={isDisable ? btnDanger : btnPrimary}
        >
          {pending ? "Bezig..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

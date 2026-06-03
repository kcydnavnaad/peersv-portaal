"use client";

import { useState, useTransition } from "react";

type ActionResult = { ok: boolean; error?: string; messageId?: string };

type Props = {
  action: (to: string) => Promise<ActionResult>;
};

export function EmailTestForm({ action }: Props) {
  const [to, setTo] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!to || pending) return;
    setResult(null);
    startTransition(async () => {
      try {
        const r = await action(to);
        setResult(r);
      } catch (err) {
        setResult({
          ok: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="to" className="block text-sm font-medium text-slate-700">
          Naar (email)
        </label>
        <input
          id="to"
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="daan.vandyck@hotmail.com"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <p className="mt-1 text-xs text-slate-500">
          Lokaal moet dit een email zijn uit EMAIL_DEV_WHITELIST.
        </p>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!to || pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? "Versturen..." : "Verstuur test email"}
      </button>

      {result?.ok && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Email verzonden. Message ID: {result.messageId ?? "—"}
        </p>
      )}
      {result && !result.ok && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Verzenden mislukt: {result.error ?? "onbekende fout"}
        </p>
      )}
    </div>
  );
}

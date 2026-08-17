"use client";

import { useState, useTransition } from "react";
import { resetTrainerPassword } from "@/app/actions/trainers";

type Props = {
  trainerId: number;
  trainerName: string;
};

export function ResetPasswordButton({ trainerId, trainerName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleClick() {
    const confirmed = window.confirm(
      `Weet je zeker dat je het wachtwoord van ${trainerName} wil resetten? Het huidige wachtwoord wordt onbruikbaar.`,
    );
    if (!confirmed) return;

    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await resetTrainerPassword(trainerId);
      if (result.error) {
        setError(result.error);
      } else if (result.newPassword) {
        setNewPassword(result.newPassword);
      }
    });
  }

  async function handleCopy() {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function handleClose() {
    setNewPassword(null);
    setError(null);
    setCopied(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
      >
        {isPending ? "Bezig..." : "Reset wachtwoord"}
      </button>

      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">Fout</h3>
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}

      {newPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold">Nieuw wachtwoord aangemaakt</h3>
            <p className="text-sm text-slate-600">
              Geef dit wachtwoord aan {trainerName}. Het wordt maar één keer
              getoond, kopieer het nu.
            </p>
            <div className="rounded-md border border-slate-300 bg-slate-50 p-4">
              <code className="text-lg font-mono text-slate-900">{newPassword}</code>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                {copied ? "Gekopieerd!" : "Kopieer wachtwoord"}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Sluiten
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Tip: vraag de trainer om dit wachtwoord meteen te wijzigen via zijn
              profielpagina.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toggleTrainerActivation } from "@/app/actions/trainers";

type Props = {
  trainerId: number;
  trainerName: string;
  isDeactivated: boolean;
};

export function ToggleActivationButton({
  trainerId,
  trainerName,
  isDeactivated,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const action = isDeactivated ? "heractiveren" : "deactiveren";
    const consequences = isDeactivated
      ? "Trainer kan weer inloggen."
      : "Trainer kan niet meer inloggen, maar historische prestaties blijven bewaard.";

    const confirmed = window.confirm(
      `Wil je ${trainerName} ${action}? ${consequences}`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await toggleTrainerActivation(trainerId);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  const label = isDeactivated ? "Heractiveren" : "Deactiveren";
  const classes = isDeactivated
    ? "rounded-md border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
    : "rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={classes}
      >
        {isPending ? "Bezig..." : label}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-700">{error}</p>
      )}
    </>
  );
}

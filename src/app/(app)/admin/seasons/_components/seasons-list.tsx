"use client";

import { useState, useTransition } from "react";
import { activateSeason, cloneTeamsToSeason } from "@/app/actions/seasons";

type Season = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  teamCount: number;
};

type Props = {
  seasons: Season[];
};

const btnPrimary =
  "rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50";
const btnSecondary =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export function SeasonsList({ seasons }: Props) {
  const [pending, startTransition] = useTransition();
  const [targetId, setTargetId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targetSeason =
    targetId !== null ? seasons.find((s) => s.id === targetId) : null;

  const handleActivate = (id: number) => {
    if (
      !confirm(
        "Weet je zeker dat je dit seizoen wil activeren? Het huidige actieve seizoen wordt uitgeschakeld.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await activateSeason(id);
      if (result.error) setError(result.error);
    });
  };

  const handleClone = (sourceId: number) => {
    if (targetId === null) return;
    setError(null);
    startTransition(async () => {
      const result = await cloneTeamsToSeason(sourceId, targetId);
      if (result.error) setError(result.error);
      else setTargetId(null);
    });
  };

  if (seasons.length === 0) {
    return <p className="text-sm text-slate-500">Geen seizoenen.</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {targetSeason && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Je staat op het punt teams te clonen NAAR <strong>{targetSeason.name}</strong>.
          Kies hieronder een seizoen MET teams als bron.
          <br />
          <button
            type="button"
            onClick={() => setTargetId(null)}
            className="mt-1 text-xs underline"
          >
            Annuleer clone
          </button>
        </p>
      )}

      {seasons.map((s) => {
        const isTarget = targetId === s.id;
        const isPotentialSource =
          targetId !== null && targetId !== s.id && s.teamCount > 0;

        return (
          <div
            key={s.id}
            className={`flex items-center justify-between rounded-md border p-3 ${
              isTarget
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{s.name}</span>
                {s.isActive && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Actief
                  </span>
                )}
                {isTarget && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Doel
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {s.startDate} → {s.endDate} · {s.teamCount}{" "}
                {s.teamCount === 1 ? "team" : "teams"}
              </p>
            </div>

            <div className="flex gap-2">
              {targetId === null && !s.isActive && (
                <button
                  type="button"
                  onClick={() => handleActivate(s.id)}
                  disabled={pending}
                  className={btnSecondary}
                >
                  Activeer
                </button>
              )}

              {targetId === null && s.teamCount === 0 && (
                <button
                  type="button"
                  onClick={() => setTargetId(s.id)}
                  disabled={pending}
                  className={btnSecondary}
                >
                  Clone teams hierheen
                </button>
              )}

              {isPotentialSource && (
                <button
                  type="button"
                  onClick={() => handleClone(s.id)}
                  disabled={pending}
                  className={btnPrimary}
                >
                  {pending ? "Bezig..." : "Gebruik als bron"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

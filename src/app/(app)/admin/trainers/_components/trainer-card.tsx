"use client";

import { useRouter } from "next/navigation";
import { formatIban, formatRate } from "@/lib/trainers";

type Props = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  trainerRate: string | null;
  isButterfly: boolean | null;
  iban: string | null;
  isDeactivated: boolean;
  lastLoginAt: Date | null;
};

export function TrainerCard({
  id,
  firstName,
  lastName,
  email,
  trainerRate,
  isButterfly,
  iban,
  isDeactivated,
  lastLoginAt,
}: Props) {
  const router = useRouter();
  const href = `/admin/trainers/${id}`;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      className={`cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50 focus:bg-slate-50 focus:outline-none ${
        isDeactivated ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">
              {firstName} {lastName}
            </span>
            {isButterfly && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                Vlinder
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-sm text-slate-600">
            {email ?? "-"}
          </div>
        </div>
        {isDeactivated ? (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
            Gedeactiveerd
          </span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
            Actief
          </span>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-slate-500">Tarief</dt>
        <dd className="text-right tabular-nums text-slate-700">
          {formatRate(trainerRate)}
        </dd>
        <dt className="text-slate-500">IBAN</dt>
        <dd className="text-right tabular-nums text-slate-600">
          {formatIban(iban)}
        </dd>
        <dt className="text-slate-500">Laatst ingelogd</dt>
        <dd className="text-right text-slate-600 text-xs">
          {lastLoginAt
            ? new Date(lastLoginAt).toLocaleString("nl-BE", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </dd>
      </dl>
    </div>
  );
}

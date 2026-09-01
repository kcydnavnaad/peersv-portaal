"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type TrainerOption = { id: number; name: string };

const PERIODS = [
  { value: "all", label: "Alle periodes" },
  { value: "month", label: "Deze maand" },
  { value: "last-month", label: "Vorige maand" },
  { value: "year", label: "Dit jaar" },
];

const STATUSES = [
  { value: "all", label: "Alle statussen" },
  { value: "open", label: "Open" },
  { value: "sent", label: "Doorgestuurd" },
  { value: "paid", label: "Betaald" },
];

const selectCls =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export function FiltersBar({ trainers }: { trainers: TrainerOption[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const trainerParam = params.get("trainer") ?? "all";
  const statusParam = params.get("status") ?? "all";
  const periodParam = params.get("period") ?? "all";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all" || value === "") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `/admin/prestaties?${qs}` : "/admin/prestaties");
    });
  }

  return (
    <div
      className={`grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 ${
        isPending ? "opacity-70" : ""
      }`}
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Trainer
        </label>
        <select
          value={trainerParam}
          onChange={(e) => setParam("trainer", e.target.value)}
          className={selectCls}
        >
          <option value="all">Alle trainers</option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Status
        </label>
        <select
          value={statusParam}
          onChange={(e) => setParam("status", e.target.value)}
          className={selectCls}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Periode
        </label>
        <select
          value={periodParam}
          onChange={(e) => setParam("period", e.target.value)}
          className={selectCls}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

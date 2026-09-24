"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

const DUTCH_MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return `${DUTCH_MONTHS[m - 1]} ${y}`;
}

export function MonthSelector({
  months,
  current,
}: {
  months: string[];
  current: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(() => {
      if (!value) {
        router.push("/admin/uitbetalingen");
      } else {
        router.push(`/admin/uitbetalingen?maand=${value}`);
      }
    });
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-slate-600">Maand-view</span>
      <select
        value={current ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={pending}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
      >
        <option value="">Open-modus (default)</option>
        {months.map((ym) => (
          <option key={ym} value={ym}>
            {formatMonth(ym)}
          </option>
        ))}
      </select>
    </label>
  );
}

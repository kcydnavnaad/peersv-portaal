"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Option = { value: string; label: string };

const selectCls =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export function MonthFilter({
  options,
  current,
}: {
  options: Option[];
  current: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setMonth(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set("month", value);
    startTransition(() => {
      router.replace(`/admin/uitbetalingen?${next.toString()}`);
    });
  }

  return (
    <div className={isPending ? "opacity-70" : ""}>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        Maand
      </label>
      <select
        value={current}
        onChange={(e) => setMonth(e.target.value)}
        className={selectCls}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

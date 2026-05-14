"use client";

import { useTransition } from "react";
import type { MouseEvent } from "react";
import {
  markPerformancePaid,
  markPerformanceUnpaid,
} from "@/app/actions/performances";

type Props = {
  id: number;
  status: "open" | "paid";
  variant?: "inline" | "detail";
};

export function PaymentToggleButton({ id, status, variant = "inline" }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (status === "paid") {
      if (!confirm("Weet je zeker dat je deze betaling ongedaan wil maken?")) {
        return;
      }
      startTransition(() => {
        markPerformanceUnpaid(id);
      });
    } else {
      startTransition(() => {
        markPerformancePaid(id);
      });
    }
  }

  if (variant === "detail") {
    const label = status === "paid" ? "Markeer als open" : "Markeer als betaald";
    const cls =
      status === "paid"
        ? "rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        : "rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700";
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`${cls} disabled:opacity-50`}
      >
        {isPending ? "Bezig..." : label}
      </button>
    );
  }

  const label = status === "paid" ? "Markeer open" : "Markeer betaald";
  const cls =
    status === "paid"
      ? "border-slate-300 text-slate-700 hover:bg-slate-50"
      : "border-emerald-300 text-emerald-700 hover:bg-emerald-50";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`rounded-md border bg-white px-2.5 py-1 text-xs font-medium ${cls} disabled:opacity-50`}
    >
      {isPending ? "..." : label}
    </button>
  );
}

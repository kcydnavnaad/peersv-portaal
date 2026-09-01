"use client";

import { useTransition } from "react";
import type { MouseEvent } from "react";
import {
  markPerformancePaid,
  markPerformanceUnpaid,
} from "@/app/actions/performances";
import { previewYearTotalAfterPayment } from "@/app/actions/payouts";

type Props = {
  id: number;
  status: "open" | "sent" | "paid";
  variant?: "inline" | "detail";
};

function formatEuros(n: number): string {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

async function confirmCapIfNeeded(id: number): Promise<boolean> {
  const preview = await previewYearTotalAfterPayment(id);
  if (preview.status === "ok") return true;
  const total = formatEuros(preview.yearTotal);
  const cap = formatEuros(preview.cap);
  if (preview.status === "warning") {
    return confirm(
      `Let op: ${preview.trainerName} nadert het jaarplafond (${total} / ${cap}). Doorgaan?`,
    );
  }
  return confirm(
    `Let op: ${preview.trainerName} zou het jaarplafond overschrijden (${total} / ${cap}). Dit kan fiscale gevolgen hebben. Doorgaan?`,
  );
}

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
      return;
    }
    startTransition(async () => {
      const ok = await confirmCapIfNeeded(id);
      if (!ok) return;
      await markPerformancePaid(id);
    });
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

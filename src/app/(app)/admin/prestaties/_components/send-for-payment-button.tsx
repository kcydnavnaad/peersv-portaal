"use client";

import { useTransition } from "react";
import type { MouseEvent } from "react";
import {
  markPerformancesAsSent,
  markPerformancesAsOpen,
} from "@/app/actions/sent-for-payment";

type Props = {
  id: number;
  status: "open" | "sent" | "paid";
};

export function SendForPaymentButton({ id, status }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    startTransition(() => {
      if (status === "open") {
        markPerformancesAsSent([id]);
      } else if (status === "sent") {
        markPerformancesAsOpen([id]);
      }
    });
  }

  if (status !== "open" && status !== "sent") return null;

  const label = status === "sent" ? "Ongedaan" : "Doorstuur";
  const cls =
    status === "sent"
      ? "border-slate-300 text-slate-700 hover:bg-slate-50"
      : "border-amber-300 text-amber-800 hover:bg-amber-50";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`rounded-md border bg-white px-2.5 py-1 text-xs font-medium ${cls} disabled:opacity-50`}
      title={
        status === "open"
          ? "Markeer als doorgestuurd ter betaling"
          : "Zet terug naar open"
      }
    >
      {isPending ? "..." : label}
    </button>
  );
}

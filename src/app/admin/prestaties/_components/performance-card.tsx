"use client";

import { useRouter } from "next/navigation";
import { formatAmount, performanceStatusLabel, performanceTypeLabel } from "@/lib/performances";
import { PaymentToggleButton } from "./payment-toggle-button";

type Props = {
  id: number;
  date: string;
  type: string;
  amount: string;
  status: "open" | "paid";
  trainerName: string;
  teamName: string | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("nl-BE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PerformanceCard({
  id,
  date,
  type,
  amount,
  status,
  trainerName,
  teamName,
}: Props) {
  const router = useRouter();
  const href = `/admin/prestaties/${id}`;
  const statusCls =
    status === "paid"
      ? "bg-emerald-50 text-emerald-800"
      : "bg-slate-100 text-slate-700";

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-900">{trainerName}</div>
          <div className="mt-1 text-sm text-slate-600">
            {formatDate(date)} · {performanceTypeLabel[type as keyof typeof performanceTypeLabel] ?? type}
          </div>
          <div className="mt-1 text-sm text-slate-600">{teamName ?? "-"}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="tabular-nums font-medium text-slate-900">
            {formatAmount(amount)}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs ${statusCls}`}>
            {performanceStatusLabel[status]}
          </span>
        </div>
      </div>
      <div
        className="mt-3 flex justify-end"
        onClick={(e) => e.stopPropagation()}
      >
        <PaymentToggleButton id={id} status={status} />
      </div>
    </div>
  );
}

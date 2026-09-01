"use client";

import { useTransition, useState } from "react";
import { bulkMarkOpenAsSent } from "@/app/actions/sent-for-payment";

type Props = {
  periodYearMonth: string;
  monthLabel: string;
  openCount: number;
  openTotalLabel: string;
};

export function BulkSendButton({
  periodYearMonth,
  monthLabel,
  openCount,
  openTotalLabel,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);

  function handleClick() {
    if (openCount === 0) return;
    const ok = confirm(
      `${openCount} open prestatie(s) van ${monthLabel} (${openTotalLabel}) doorsturen ter betaling?`,
    );
    if (!ok) return;
    startTransition(async () => {
      const res = await bulkMarkOpenAsSent({
        periodYearMonth,
      });
      setFlash(`${res.count} prestatie(s) doorgestuurd.`);
      setTimeout(() => setFlash(null), 4000);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || openCount === 0}
        className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending
          ? "Bezig..."
          : openCount === 0
            ? "Niets om door te sturen"
            : `Doorstuur ${openCount} open (${openTotalLabel}) ter betaling`}
      </button>
      {flash && (
        <p className="rounded-md bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
          {flash}
        </p>
      )}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { exportPayoutsCsv } from "@/app/actions/payouts";

export function ExportCsvButton({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const { csv, filename } = await exportPayoutsCsv(year, month);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
    >
      {isPending ? "Bezig..." : "Exporteer CSV"}
    </button>
  );
}

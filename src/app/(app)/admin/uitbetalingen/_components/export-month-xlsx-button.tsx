"use client";

import { useTransition } from "react";
import { exportMonthViewXlsx } from "@/app/actions/payouts";

export function ExportMonthXlsxButton({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const { bytes, filename, contentType } = await exportMonthViewXlsx(
        year,
        month,
      );
      const blob = new Blob([new Uint8Array(bytes)], { type: contentType });
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
      {isPending ? "Bezig..." : "Exporteer maand"}
    </button>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  markTrainerMonthAsPaid,
  previewMarkTrainerMonthAsPaid,
} from "@/app/actions/payouts";

type Props = {
  trainerId: number;
  year: number;
  month: number;
  monthLabel: string;
  hasUnpaid: boolean;
};

function formatEuro(n: number): string {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export function MarkMonthPaidButton({
  trainerId,
  year,
  month,
  monthLabel,
  hasUnpaid,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (!hasUnpaid) return null;

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      const preview = await previewMarkTrainerMonthAsPaid(trainerId, year, month);
      if (preview.count === 0) {
        alert("Geen openstaande prestaties voor deze trainer in deze maand.");
        return;
      }

      let msg = `${preview.count} prestatie${preview.count === 1 ? "" : "s"} voor ${preview.trainerName} in ${monthLabel} (${formatEuro(preview.totalAmount)}) markeren als betaald?`;

      if (preview.statusAfter === "warning") {
        msg += `\n\nLet op: jaartotaal komt op ${formatEuro(preview.yearTotalAfter)} van ${formatEuro(preview.cap)} (bijna plafond).`;
      } else if (preview.statusAfter === "exceeded") {
        msg += `\n\nWAARSCHUWING: jaartotaal komt op ${formatEuro(preview.yearTotalAfter)} van ${formatEuro(preview.cap)} — plafond overschreden. Dit kan fiscale gevolgen hebben.`;
      }

      if (!confirm(msg)) return;

      await markTrainerMonthAsPaid(trainerId, year, month);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-md border border-emerald-600 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
    >
      {pending ? "Bezig..." : "Markeer betaald"}
    </button>
  );
}

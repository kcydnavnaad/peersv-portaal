"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminDeletePerformance } from "@/app/actions/performances";

type Props = {
  performanceId: number;
  status: "open" | "sent" | "paid";
  trainerName: string;
  performanceDate: string;
  amount: string;
};

export function AdminDeleteButton({
  performanceId,
  status,
  trainerName,
  performanceDate,
  amount,
}: Props) {
  const [pending, start] = useTransition();
  const router = useRouter();

  async function onDelete() {
    const base = `Prestatie verwijderen?\n\n${trainerName}\n${performanceDate}\n€ ${amount}`;
    let msg = base;

    if (status === "paid") {
      msg = `Let op: deze prestatie is al BETAALD aan de trainer.\n\n${base}\n\nToch verwijderen?`;
    } else if (status === "sent") {
      msg = `Let op: deze prestatie is al doorgestuurd ter betaling.\n\n${base}\n\nToch verwijderen?`;
    }

    if (!confirm(msg)) return;

    start(async () => {
      await adminDeletePerformance(performanceId);
      router.push("/admin/prestaties");
    });
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="text-sm text-red-700 hover:text-red-900 hover:underline disabled:opacity-50"
    >
      {pending ? "Bezig..." : "Verwijderen"}
    </button>
  );
}

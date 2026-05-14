"use client";

import { useTransition } from "react";
import { deletePerformance } from "@/app/actions/performances";

export function DeletePerformanceButton({ id }: { id: number }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Weet je zeker dat je deze prestatie wil verwijderen?")) return;
    startTransition(() => {
      deletePerformance(id);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {isPending ? "Bezig..." : "Verwijderen"}
    </button>
  );
}

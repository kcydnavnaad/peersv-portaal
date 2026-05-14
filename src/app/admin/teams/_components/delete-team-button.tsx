"use client";

import { useTransition } from "react";
import { deleteTeam } from "@/app/actions/teams";

export function DeleteTeamButton({
  id,
  label,
}: {
  id: number;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm(
        `Weet je zeker dat je team "${label}" wil verwijderen? Gekoppelde trainers worden ook losgekoppeld.`,
      )
    ) {
      return;
    }
    startTransition(() => {
      deleteTeam(id);
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

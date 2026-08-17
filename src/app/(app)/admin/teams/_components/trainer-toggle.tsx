"use client";

import { useTransition } from "react";

type Props = {
  teamId: number;
  userId: number;
  checked: boolean;
  disabled?: boolean;
  label?: string;
  action: (teamId: number, userId: number) => Promise<void>;
};

export function TrainerToggle({
  teamId,
  userId,
  checked,
  disabled,
  label,
  action,
}: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <label
      className={`inline-flex items-center gap-2 text-sm ${
        disabled ? "text-slate-400" : "text-slate-700"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled || isPending}
        onChange={() => {
          startTransition(async () => {
            await action(teamId, userId);
          });
        }}
        className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 disabled:opacity-50"
      />
      {label && <span>{label}</span>}
    </label>
  );
}

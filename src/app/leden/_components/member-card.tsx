"use client";

import { useRouter } from "next/navigation";

type Props = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  teamNames: string | null;
  statusLabel: string;
};

export function MemberCard({
  id,
  firstName,
  lastName,
  email,
  teamNames,
  statusLabel,
}: Props) {
  const router = useRouter();
  const href = `/leden/${id}`;

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
          <div className="font-medium text-slate-900">
            {firstName} {lastName}
          </div>
          <div className="mt-1 truncate text-sm text-slate-600">
            {email ?? "-"}
          </div>
          <div className="mt-1 text-sm text-slate-600">
            {teamNames ?? "-"}
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

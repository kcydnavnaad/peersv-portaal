"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function PerformanceRow({
  id,
  children,
}: {
  id: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const href = `/admin/prestaties/${id}`;

  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      className="cursor-pointer hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
    >
      {children}
    </tr>
  );
}

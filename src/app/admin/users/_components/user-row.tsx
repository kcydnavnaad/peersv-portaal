"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function UserRow({
  href,
  children,
}: {
  href: string | null;
  children: ReactNode;
}) {
  const router = useRouter();

  if (href === null) {
    return <tr>{children}</tr>;
  }

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

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NavItem =
  | { href: string; label: string }
  | { separator: true; label: string };

type Props = {
  links: NavItem[];
};

export function MobileNav({ links }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open]);

  return (
    <div ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-expanded={open}
        aria-label="Open menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {open ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 top-full mt-0 border-t border-slate-200 bg-white shadow-lg z-20"
        >
          {links.map((link, idx) => {
            if ("separator" in link) {
              return (
                <div
                  key={`sep-${idx}`}
                  className="border-b border-slate-200 bg-slate-50 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {link.label}
                </div>
              );
            }
            return (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block border-b border-slate-100 px-6 py-4 text-base text-slate-700 hover:bg-slate-50"
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

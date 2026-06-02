"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelEvent,
  uncancelEvent,
  deleteEvent,
  deleteSeries,
} from "@/app/actions/events";

export function EventDetailActions({
  eventId,
  seriesId,
  isCancelled,
}: {
  eventId: number;
  seriesId: string | null;
  isCancelled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleCancel() {
    if (pending) return;
    setPending(true);
    try {
      await cancelEvent(eventId);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleUncancel() {
    if (pending) return;
    setPending(true);
    try {
      await uncancelEvent(eventId);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (pending) return;
    if (!confirm("Dit event definitief verwijderen?")) return;
    setPending(true);
    try {
      await deleteEvent(eventId);
      router.push("/admin/events");
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteSeries() {
    if (pending || !seriesId) return;
    if (!confirm("Alle events in deze reeks definitief verwijderen?")) return;
    setPending(true);
    try {
      const { deleted } = await deleteSeries(seriesId);
      alert(`${deleted} events verwijderd.`);
      router.push("/admin/events");
    } finally {
      setPending(false);
    }
  }

  const btnCls =
    "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50";
  const dangerCls =
    "rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50";

  return (
    <div className="flex flex-wrap gap-2">
      {!isCancelled ? (
        <button onClick={handleCancel} disabled={pending} className={btnCls}>
          Annuleren
        </button>
      ) : (
        <button onClick={handleUncancel} disabled={pending} className={btnCls}>
          Heractiveren
        </button>
      )}
      <button onClick={handleDelete} disabled={pending} className={dangerCls}>
        Verwijderen
      </button>
      {seriesId && (
        <button onClick={handleDeleteSeries} disabled={pending} className={dangerCls}>
          Hele reeks verwijderen
        </button>
      )}
    </div>
  );
}

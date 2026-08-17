"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { EventFormState, EventType, Recurrence } from "@/lib/events";

type TeamOption = { id: number; name: string; category: string | null };

type Props = {
  action: (state: EventFormState, fd: FormData) => Promise<EventFormState>;
  teams: TeamOption[];
  cancelHref: string;
  submitLabel: string;
  defaults?: {
    title?: string;
    description?: string;
    type?: EventType;
    teamId?: number | null;
    location?: string;
    startsAt?: string;
    endsAt?: string;
    allDay?: boolean;
  };
  showRecurrence?: boolean;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelCls = "block text-sm font-medium text-slate-700";
const errorCls = "mt-1 text-xs text-red-600";

export function EventForm({
  action,
  teams,
  cancelHref,
  submitLabel,
  defaults,
  showRecurrence = false,
}: Props) {
  const [state, formAction, isPending] = useActionState<EventFormState, FormData>(action, {});
  const [recurrence, setRecurrence] = useState<Recurrence>("none");

  const v = (key: string, fallback?: string) =>
    state.values?.[key] ?? fallback ?? "";

  return (
    <form action={formAction} className="space-y-4">
      {state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="title" className={labelCls}>Titel *</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={v("title", defaults?.title)}
          className={inputCls}
        />
        {state.errors?.title && <p className={errorCls}>{state.errors.title}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className={labelCls}>Type *</label>
          <select
            id="type"
            name="type"
            required
            defaultValue={v("type", defaults?.type ?? "training")}
            className={inputCls}
          >
            <option value="training">Training</option>
            <option value="match">Wedstrijd</option>
            <option value="meeting">Vergadering</option>
            <option value="tournament">Tornooi</option>
            <option value="other">Anders</option>
          </select>
        </div>
        <div>
          <label htmlFor="teamId" className={labelCls}>Team</label>
          <select
            id="teamId"
            name="teamId"
            defaultValue={v("teamId", defaults?.teamId != null ? String(defaults.teamId) : "")}
            className={inputCls}
          >
            <option value="">Clubbreed (geen team)</option>
            {teams.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}{t.category ? ` (${t.category})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startsAt" className={labelCls}>Start *</label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={v("startsAt", defaults?.startsAt)}
            className={inputCls}
          />
          {state.errors?.startsAt && <p className={errorCls}>{state.errors.startsAt}</p>}
        </div>
        <div>
          <label htmlFor="endsAt" className={labelCls}>Einde *</label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={v("endsAt", defaults?.endsAt)}
            className={inputCls}
          />
          {state.errors?.endsAt && <p className={errorCls}>{state.errors.endsAt}</p>}
        </div>
      </div>

      <div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="allDay"
            defaultChecked={defaults?.allDay ?? false}
            className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
          />
          <span>Hele dag</span>
        </label>
      </div>

      <div>
        <label htmlFor="location" className={labelCls}>Locatie</label>
        <input
          id="location"
          name="location"
          type="text"
          placeholder="Sportcomplex De Klamp"
          defaultValue={v("location", defaults?.location)}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelCls}>Beschrijving</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={v("description", defaults?.description)}
          className={inputCls}
        />
      </div>

      {showRecurrence && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div>
            <span className={labelCls}>Herhaling</span>
            <div className="mt-2 flex gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="recurrence"
                  value="none"
                  checked={recurrence === "none"}
                  onChange={() => setRecurrence("none")}
                  className="size-4"
                />
                <span>Eénmalig</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="recurrence"
                  value="weekly"
                  checked={recurrence === "weekly"}
                  onChange={() => setRecurrence("weekly")}
                  className="size-4"
                />
                <span>Wekelijks</span>
              </label>
            </div>
          </div>
          {recurrence === "weekly" && (
            <div>
              <label htmlFor="repeatUntil" className={labelCls}>
                Herhaal tot en met *
              </label>
              <input
                id="repeatUntil"
                name="repeatUntil"
                type="date"
                required
                defaultValue={v("repeatUntil")}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate-500">
                Bv. einde seizoen. Maximaal 200 instances worden gegenereerd.
              </p>
              {state.errors?.repeatUntil && (
                <p className={errorCls}>{state.errors.repeatUntil}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
        <Link
          href={cancelHref}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          Annuleren
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? "Bezig..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

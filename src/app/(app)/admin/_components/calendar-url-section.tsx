"use client";

import { useState, useTransition } from "react";
import {
  ensureTeamCalendarToken,
  ensureClubCalendarToken,
  regenerateTeamCalendarToken,
  regenerateClubCalendarToken,
} from "@/app/actions/calendar-tokens";

type Props =
  | {
      scope: "team";
      teamId: number;
      initialToken: string | null;
    }
  | {
      scope: "club";
      initialToken: string | null;
    };

export function CalendarUrlSection(props: Props) {
  const [token, setToken] = useState<string | null>(props.initialToken);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function buildUrl(t: string): string {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    if (props.scope === "team") {
      return `${base}/api/calendar/team/${props.teamId}/${t}.ics`;
    }
    return `${base}/api/calendar/club/${t}.ics`;
  }

  async function handleGenerate() {
    startTransition(async () => {
      try {
        const newToken =
          props.scope === "team"
            ? await ensureTeamCalendarToken(props.teamId)
            : await ensureClubCalendarToken();
        setToken(newToken);
      } catch (err) {
        console.error(err);
        alert("Genereren mislukt. Probeer opnieuw.");
      }
    });
  }

  async function handleRegenerate() {
    if (!confirm("Een nieuwe link maken? De oude link werkt niet meer en abonnees zien geen updates meer tot ze de nieuwe link gebruiken.")) {
      return;
    }
    startTransition(async () => {
      try {
        const result =
          props.scope === "team"
            ? await regenerateTeamCalendarToken(props.teamId)
            : await regenerateClubCalendarToken();
        setToken(result.token);
      } catch (err) {
        console.error(err);
        alert("Vernieuwen mislukt. Probeer opnieuw.");
      }
    });
  }

  async function handleCopy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(buildUrl(token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Kopiëren mislukt. Selecteer de URL handmatig.");
    }
  }

  const heading =
    props.scope === "team" ? "Kalender-link voor dit team" : "Clubbreed kalender-link";

  const explanation =
    props.scope === "team"
      ? "Deel deze URL met trainers en ouders. Plakken in iPhone Agenda / Google Calendar / Outlook synchroniseert de events van dit team automatisch."
      : "Deel deze URL voor clubbrede events (vergaderingen, eetfestijn, evenementen). Niet team-specifiek.";

  if (!token) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">{heading}</h2>
        <p className="mt-1 text-sm text-slate-600">{explanation}</p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={pending}
          className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? "Bezig..." : "Genereer kalender-link"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">{heading}</h2>
      <p className="mt-1 text-sm text-slate-600">{explanation}</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          readOnly
          value={buildUrl(token)}
          onFocus={(e) => e.target.select()}
          className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono"
        />
        <button
          type="button"
          onClick={handleCopy}
          disabled={pending}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {copied ? "Gekopieerd!" : "Kopieer"}
        </button>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={pending}
          className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {pending ? "Bezig..." : "Vernieuw link"}
        </button>
      </div>
    </div>
  );
}

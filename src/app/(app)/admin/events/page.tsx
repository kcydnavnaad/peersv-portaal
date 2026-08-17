import Link from "next/link";
import { and, asc, eq, gte, lt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { events, teams } from "@/db/schema";
import { EVENT_TYPE_LABELS } from "@/lib/events";

export const dynamic = "force-dynamic";

type Period = "week" | "month" | "all";

function getRangeForPeriod(period: Period): { start: Date; end: Date | null } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") {
    const end = new Date(startOfDay);
    end.setDate(end.getDate() + 7);
    return { start: startOfDay, end };
  }
  if (period === "month") {
    const end = new Date(startOfDay);
    end.setMonth(end.getMonth() + 1);
    return { start: startOfDay, end };
  }
  return { start: startOfDay, end: null };
}

function formatDateTimeRange(starts: Date, ends: Date, allDay: boolean): string {
  const fmtDate = new Intl.DateTimeFormat("nl-BE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const fmtTime = new Intl.DateTimeFormat("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const sameDay =
    starts.getFullYear() === ends.getFullYear() &&
    starts.getMonth() === ends.getMonth() &&
    starts.getDate() === ends.getDate();

  if (allDay) {
    return sameDay
      ? `${fmtDate.format(starts)} (hele dag)`
      : `${fmtDate.format(starts)} → ${fmtDate.format(ends)}`;
  }

  if (sameDay) {
    return `${fmtDate.format(starts)} ${fmtTime.format(starts)}–${fmtTime.format(ends)}`;
  }
  return `${fmtDate.format(starts)} ${fmtTime.format(starts)} → ${fmtDate.format(ends)} ${fmtTime.format(ends)}`;
}

export default async function EventsListPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; team?: string; created?: string }>;
}) {
  const sp = await searchParams;
  const period: Period =
    sp.period === "month" || sp.period === "all" ? sp.period : "week";
  const teamFilter = sp.team === "club" ? "club" : sp.team ? Number(sp.team) : null;
  const createdCount = sp.created;

  const { start, end } = getRangeForPeriod(period);

  const conds = [gte(events.startsAt, start)];
  if (end) conds.push(lt(events.startsAt, end));
  if (teamFilter === "club") conds.push(isNull(events.teamId));
  else if (typeof teamFilter === "number" && Number.isFinite(teamFilter)) {
    conds.push(eq(events.teamId, teamFilter));
  }

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      type: events.type,
      status: events.status,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      allDay: events.allDay,
      location: events.location,
      teamId: events.teamId,
      teamName: teams.name,
    })
    .from(events)
    .leftJoin(teams, eq(teams.id, events.teamId))
    .where(and(...conds))
    .orderBy(asc(events.startsAt));

  const allTeams = await db
    .select({ id: teams.id, name: teams.name, category: teams.category })
    .from(teams)
    .orderBy(asc(teams.category), asc(teams.name));

  const periodLabels: Record<Period, string> = {
    week: "Komende week",
    month: "Komende maand",
    all: "Alle komende",
  };

  return (
    <div className="space-y-6">
      {createdCount && (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {createdCount === "1"
            ? "Event aangemaakt."
            : `${createdCount} events aangemaakt.`}
        </p>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Kalender</h1>
          <p className="mt-1 text-sm text-slate-600">
            {rows.length} {rows.length === 1 ? "event" : "events"} (
            {periodLabels[period].toLowerCase()}).
          </p>
        </div>
        <Link
          href="/admin/events/nieuw"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Nieuw event
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Periode:</span>
          <PeriodLink current={period} target="week" team={sp.team} label="Week" />
          <PeriodLink current={period} target="month" team={sp.team} label="Maand" />
          <PeriodLink current={period} target="all" team={sp.team} label="Alles" />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="team-filter" className="text-slate-500">
            Team:
          </label>
          <form className="flex items-center gap-2">
            <input type="hidden" name="period" value={period} />
            <select
              id="team-filter"
              name="team"
              defaultValue={typeof teamFilter === "number" ? String(teamFilter) : teamFilter ?? ""}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
            >
              <option value="">Alle teams</option>
              <option value="club">Clubbreed</option>
              {allTeams.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                  {t.category ? ` (${t.category})` : ""}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50"
            >
              Filter
            </button>
          </form>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Geen events in deze periode.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {rows.map((e) => {
              const isCancelled = e.status === "cancelled";
              const liCls = isCancelled
                ? "p-4 opacity-60 line-through"
                : "p-4 hover:bg-slate-50";
              return (
                <li key={e.id}>
                  <Link href={`/admin/events/${e.id}`} className={`block ${liCls}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="font-medium">{e.title}</div>
                        <div className="text-xs text-slate-500">
                          {formatDateTimeRange(
                            new Date(e.startsAt),
                            new Date(e.endsAt),
                            e.allDay,
                          )}
                          {e.location ? ` · ${e.location}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {EVENT_TYPE_LABELS[e.type]}
                        </span>
                        {e.teamName ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                            {e.teamName}
                          </span>
                        ) : (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                            Clubbreed
                          </span>
                        )}
                        {isCancelled && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                            Geannuleerd
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function PeriodLink({
  current,
  target,
  team,
  label,
}: {
  current: Period;
  target: Period;
  team?: string;
  label: string;
}) {
  const active = current === target;
  const params = new URLSearchParams();
  if (target !== "week") params.set("period", target);
  if (team) params.set("team", team);
  const qs = params.toString();
  const href = qs ? `/admin/events?${qs}` : "/admin/events";

  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white"
          : "rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
      }
    >
      {label}
    </Link>
  );
}

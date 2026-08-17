import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, teams, users } from "@/db/schema";
import { EVENT_TYPE_LABELS } from "@/lib/events";
import { EventDetailActions } from "../_components/event-detail-actions";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();

  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      type: events.type,
      status: events.status,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      allDay: events.allDay,
      location: events.location,
      teamId: events.teamId,
      teamName: teams.name,
      seriesId: events.seriesId,
      createdAt: events.createdAt,
      createdByName: users.firstName,
      createdByLastName: users.lastName,
    })
    .from(events)
    .leftJoin(teams, eq(teams.id, events.teamId))
    .leftJoin(users, eq(users.id, events.createdBy))
    .where(eq(events.id, id))
    .limit(1);

  if (!event) notFound();

  const fmtDateTime = new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isCancelled = event.status === "cancelled";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/events" className="text-sm text-slate-500 hover:underline">
          ← Terug naar kalender
        </Link>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className={`text-3xl font-semibold tracking-tight ${isCancelled ? "line-through opacity-60" : ""}`}>
            {event.title}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              {EVENT_TYPE_LABELS[event.type]}
            </span>
            {event.teamName ? (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                {event.teamName}
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
            {event.seriesId && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                Reeks
              </span>
            )}
          </div>
        </div>
        <EventDetailActions
          eventId={event.id}
          seriesId={event.seriesId}
          isCancelled={isCancelled}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <dl className="divide-y divide-slate-100 text-sm">
          <Row label="Start">
            {fmtDateTime.format(new Date(event.startsAt))}
          </Row>
          <Row label="Einde">
            {fmtDateTime.format(new Date(event.endsAt))}
          </Row>
          {event.allDay && <Row label="Hele dag">Ja</Row>}
          <Row label="Locatie">{event.location ?? "—"}</Row>
          <Row label="Beschrijving">
            {event.description ? (
              <span className="whitespace-pre-wrap">{event.description}</span>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Aangemaakt">
            {new Date(event.createdAt).toLocaleString("nl-BE")}
            {event.createdByName ? ` door ${event.createdByName} ${event.createdByLastName ?? ""}` : ""}
          </Row>
        </dl>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 px-4 py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="md:col-span-2 text-slate-800">{children}</dd>
    </div>
  );
}

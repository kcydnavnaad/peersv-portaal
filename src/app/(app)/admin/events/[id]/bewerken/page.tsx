import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, teams } from "@/db/schema";
import { updateEvent } from "@/app/actions/events";
import { EventForm } from "../../_components/event-form";

export const dynamic = "force-dynamic";

function formatForInput(date: Date): string {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const lookup: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") lookup[p.type] = p.value;
  }
  return `${lookup.year}-${lookup.month}-${lookup.day}T${lookup.hour}:${lookup.minute}`;
}

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!event) {
    notFound();
  }

  if (event.status === "cancelled") {
    redirect(`/admin/events/${id}`);
  }

  const teamList = await db
    .select({
      id: teams.id,
      name: teams.name,
      category: teams.category,
    })
    .from(teams)
    .orderBy(asc(teams.category), asc(teams.name));

  const boundAction = updateEvent.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/events/${id}`}
          className="text-sm text-slate-600 hover:underline"
        >
          ← Terug naar event
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Event bewerken
        </h1>
      </div>

      <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <EventForm
          action={boundAction}
          teams={teamList}
          cancelHref={`/admin/events/${id}`}
          submitLabel="Wijzigingen opslaan"
          showRecurrence={false}
          defaults={{
            title: event.title,
            description: event.description ?? "",
            type: event.type,
            teamId: event.teamId,
            location: event.location ?? "",
            startsAt: formatForInput(event.startsAt),
            endsAt: formatForInput(event.endsAt),
            allDay: event.allDay,
          }}
        />
      </div>
    </div>
  );
}

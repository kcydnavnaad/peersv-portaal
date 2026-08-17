import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { createEvent } from "@/app/actions/events";
import { EventForm } from "../_components/event-form";

export default async function NewEventPage() {
  const allTeams = await db
    .select({ id: teams.id, name: teams.name, category: teams.category })
    .from(teams)
    .orderBy(asc(teams.category), asc(teams.name));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/events" className="text-sm text-slate-500 hover:underline">
          ← Terug naar kalender
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Nieuw event</h1>
      </div>

      <EventForm
        action={createEvent}
        teams={allTeams}
        cancelHref="/admin/events"
        submitLabel="Aanmaken"
        showRecurrence={true}
      />
    </div>
  );
}

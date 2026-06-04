"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events } from "@/db/schema";
import {
  flattenEventErrors,
  parseEventCreateForm,
  parseEventUpdateForm,
  valuesFromEventFormData,
  type EventFormState,
} from "@/lib/events";
import { requireAdmin } from "./users";

/**
 * Voeg N dagen toe aan een Date.
 */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const CLUB_TIMEZONE = "Europe/Brussels";

/**
 * Parse een datetime-local string ("YYYY-MM-DDTHH:mm" of met seconden) en
 * interpreteer hem expliciet als Europe/Brussels tijd. Returnt een UTC Date.
 *
 * Reden: new Date(value) zonder TZ-suffix interpreteert als lokale server-tijd.
 * Op K8s pods is dat meestal UTC (geen tzdata in alpine image), wat tot
 * een offset van 1-2 uur leidt. Door hier expliciet als Brussels te parsen
 * zijn we onafhankelijk van de server-OS configuratie.
 */
function parseDateTimeLocal(value: string): Date {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) {
    throw new Error(`Invalid datetime-local string: ${value}`);
  }
  const [, year, month, day, hour, minute, second] = match;

  const naiveUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    second ? Number(second) : 0,
  );

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = dtf.formatToParts(new Date(naiveUtc));
  const lookup: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") lookup[p.type] = p.value;
  }

  const localUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second),
  );

  const offset = localUtc - naiveUtc;
  return new Date(naiveUtc - offset);
}

export async function createEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireAdmin();

  const session = await auth();
  const createdBy = Number(session?.user?.id);
  if (!Number.isFinite(createdBy)) {
    throw new Error("No user id in session");
  }

  const parsed = parseEventCreateForm(formData);
  if (!parsed.success) {
    return {
      errors: flattenEventErrors(parsed.error),
      values: valuesFromEventFormData(formData),
    };
  }

  const data = parsed.data;
  const startsAt = parseDateTimeLocal(data.startsAt);
  const endsAt = parseDateTimeLocal(data.endsAt);

  if (data.recurrence === "none") {
    // Single event
    const [created] = await db
      .insert(events)
      .values({
        title: data.title,
        description: data.description,
        type: data.type,
        teamId: data.teamId,
        location: data.location,
        startsAt,
        endsAt,
        allDay: data.allDay,
        createdBy,
      })
      .returning({ id: events.id });

    revalidatePath("/admin/events");
    redirect(`/admin/events?created=1`);
  }

  // Weekly recurring: genereer instances tot repeatUntil
  if (data.recurrence === "weekly") {
    if (!data.repeatUntil) {
      return {
        errors: { repeatUntil: "Einddatum is verplicht voor herhalend event" },
        values: valuesFromEventFormData(formData),
      };
    }

    const until = new Date(`${data.repeatUntil}T23:59:59`);
    if (until < startsAt) {
      return {
        errors: { repeatUntil: "Einddatum moet na starttijd liggen" },
        values: valuesFromEventFormData(formData),
      };
    }

    const seriesId = randomUUID();
    const duration = endsAt.getTime() - startsAt.getTime();

    type EventInsert = typeof events.$inferInsert;
    const rows: EventInsert[] = [];
    let currentStart = startsAt;

    // Hard limit op 200 instances om runaways te voorkomen
    const MAX_INSTANCES = 200;

    while (currentStart <= until && rows.length < MAX_INSTANCES) {
      rows.push({
        title: data.title,
        description: data.description,
        type: data.type,
        teamId: data.teamId,
        location: data.location,
        startsAt: currentStart,
        endsAt: new Date(currentStart.getTime() + duration),
        allDay: data.allDay,
        seriesId,
        createdBy,
      });
      currentStart = addDays(currentStart, 7);
    }

    if (rows.length === 0) {
      return {
        errors: { repeatUntil: "Geen instances gegenereerd" },
        values: valuesFromEventFormData(formData),
      };
    }

    await db.insert(events).values(rows);

    revalidatePath("/admin/events");
    redirect(`/admin/events?created=${rows.length}`);
  }

  // Should not reach here
  return {
    errors: { recurrence: "Onbekende herhalingsoptie" },
    values: valuesFromEventFormData(formData),
  };
}

export async function updateEvent(
  id: number,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireAdmin();

  const [existing] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!existing) {
    return { message: "Event niet gevonden." };
  }

  const parsed = parseEventUpdateForm(formData);
  if (!parsed.success) {
    return {
      errors: flattenEventErrors(parsed.error),
      values: valuesFromEventFormData(formData),
    };
  }

  const data = parsed.data;
  await db
    .update(events)
    .set({
      title: data.title,
      description: data.description,
      type: data.type,
      teamId: data.teamId,
      location: data.location,
      startsAt: parseDateTimeLocal(data.startsAt),
      endsAt: parseDateTimeLocal(data.endsAt),
      allDay: data.allDay,
      updatedAt: new Date(),
    })
    .where(eq(events.id, id));

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  redirect(`/admin/events/${id}`);
}

export async function cancelEvent(id: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db
    .update(events)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(events.id, id));
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  return { ok: true };
}

export async function uncancelEvent(id: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db
    .update(events)
    .set({ status: "scheduled", updatedAt: new Date() })
    .where(eq(events.id, id));
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  return { ok: true };
}

export async function deleteEvent(id: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  await db.delete(events).where(eq(events.id, id));
  revalidatePath("/admin/events");
  return { ok: true };
}

export async function deleteSeries(
  seriesId: string,
): Promise<{ deleted: number }> {
  await requireAdmin();
  const result = await db
    .delete(events)
    .where(eq(events.seriesId, seriesId))
    .returning({ id: events.id });
  revalidatePath("/admin/events");
  return { deleted: result.length };
}

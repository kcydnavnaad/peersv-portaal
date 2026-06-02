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

/**
 * Combineer datetime-local string (lokaal) naar Date object (UTC).
 * Datetime-local heeft geen TZ-info, we interpreteren als lokale browser tijd.
 */
function parseDateTimeLocal(value: string): Date {
  // value: "2026-09-15T18:00" of "2026-09-15T18:00:00"
  // new Date(value) interpreteert dit als lokale tijd, wat we willen.
  return new Date(value);
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

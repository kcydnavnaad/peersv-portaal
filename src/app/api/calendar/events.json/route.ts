import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { events, settings } from "@/db/schema";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://kpeersv.be",
  "Access-Control-Allow-Methods": "GET",
  "Cache-Control": "public, max-age=300",
};

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "club_calendar_token"))
    .limit(1);

  if (!row || row.value !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Time window: 6 months back, 18 months forward.
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const end = new Date(now.getFullYear() + 1, now.getMonth() + 6, 1);

  const rows = await db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      allDay: events.allDay,
      description: events.description,
      location: events.location,
      type: events.type,
    })
    .from(events)
    .where(
      and(
        isNull(events.teamId),
        gte(events.startsAt, start),
        lt(events.startsAt, end),
      ),
    );

  const fcEvents = rows.map((e) => ({
    id: e.id.toString(),
    title: e.title,
    start: e.startsAt.toISOString(),
    end: e.endsAt.toISOString(),
    allDay: e.allDay,
    extendedProps: {
      description: e.description || undefined,
      location: e.location || undefined,
      type: e.type,
    },
  }));

  return NextResponse.json(fcEvents, { headers: CORS_HEADERS });
}

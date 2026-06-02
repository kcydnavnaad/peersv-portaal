import { and, gte, isNull, lt } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { events, settings } from "@/db/schema";
import { buildIcsFeed } from "@/lib/ics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: tokenWithExt } = await params;
  const token = tokenWithExt.replace(/\.ics$/, "");

  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "club_calendar_token"))
    .limit(1);

  if (!row || row.value !== token) {
    return new Response("Not found", { status: 404 });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(startOfDay);
  end.setFullYear(end.getFullYear() + 1);

  const rows = await db
    .select()
    .from(events)
    .where(
      and(
        isNull(events.teamId),
        gte(events.startsAt, startOfDay),
        lt(events.startsAt, end),
      ),
    );

  const ics = buildIcsFeed({
    calendarName: "PeerSV - Clubbreed",
    events: rows,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

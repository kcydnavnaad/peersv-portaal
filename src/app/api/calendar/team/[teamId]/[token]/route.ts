import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { events, teams } from "@/db/schema";
import { buildIcsFeed } from "@/lib/ics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; token: string }> },
) {
  const { teamId: teamIdStr, token: tokenWithExt } = await params;
  const teamId = Number(teamIdStr);
  if (!Number.isFinite(teamId)) {
    return new Response("Not found", { status: 404 });
  }

  // Verwijder .ics extensie als die in de URL zat
  const token = tokenWithExt.replace(/\.ics$/, "");

  const [team] = await db
    .select({
      id: teams.id,
      name: teams.name,
      calendarToken: teams.calendarToken,
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team || !team.calendarToken || team.calendarToken !== token) {
    return new Response("Not found", { status: 404 });
  }

  // Events van vandaag tot 365 dagen vooruit
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(startOfDay);
  end.setFullYear(end.getFullYear() + 1);

  const rows = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.teamId, teamId),
        gte(events.startsAt, startOfDay),
        lt(events.startsAt, end),
      ),
    );

  const ics = buildIcsFeed({
    calendarName: `PeerSV - ${team.name}`,
    events: rows,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}

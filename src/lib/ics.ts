import type { events } from "@/db/schema";

type EventRow = typeof events.$inferSelect;

function fmtUtcDate(d: Date): string {
  // 20260610T180000Z
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function fmtDate(d: Date): string {
  // 20260610 (voor all-day events, in Europe/Brussels timezone)
  // Use Intl.DateTimeFormat with Brussels timezone to get local date parts —
  // an event stored at 2026-10-24 00:00+02 is 2026-10-23 22:00 UTC, but must
  // render as 20261024 in the ICS all-day format.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";

  return `${year}${month}${day}`;
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldLine(line: string): string {
  // RFC 5545: lines longer than 75 octets must be folded
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + (i === 0 ? 75 : 74));
    out.push((i === 0 ? "" : " ") + chunk);
    i += i === 0 ? 75 : 74;
  }
  return out.join("\r\n");
}

export function buildIcsFeed(params: {
  calendarName: string;
  events: EventRow[];
}): string {
  const { calendarName, events } = params;
  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//PeerSV Portaal//Calendar//NL");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push(`X-WR-CALNAME:${escapeIcs(calendarName)}`);

  const dtstamp = fmtUtcDate(new Date());

  for (const e of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:event-${e.id}@peersv-portaal`);
    lines.push(`DTSTAMP:${dtstamp}`);

    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${fmtDate(new Date(e.startsAt))}`);
      // Voor all-day: DTEND is exclusief, dus +1 dag
      const endPlusOne = new Date(e.endsAt);
      endPlusOne.setUTCDate(endPlusOne.getUTCDate() + 1);
      lines.push(`DTEND;VALUE=DATE:${fmtDate(endPlusOne)}`);
    } else {
      lines.push(`DTSTART:${fmtUtcDate(new Date(e.startsAt))}`);
      lines.push(`DTEND:${fmtUtcDate(new Date(e.endsAt))}`);
    }

    lines.push(`SUMMARY:${escapeIcs(e.title)}`);

    if (e.description) {
      lines.push(`DESCRIPTION:${escapeIcs(e.description)}`);
    }

    if (e.location) {
      lines.push(`LOCATION:${escapeIcs(e.location)}`);
    }

    if (e.status === "cancelled") {
      lines.push("STATUS:CANCELLED");
    } else {
      lines.push("STATUS:CONFIRMED");
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // Fold lines + join met CRLF
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

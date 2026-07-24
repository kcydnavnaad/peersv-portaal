import { db } from "@/db";
import { authEvents } from "@/db/schema";

export type AuthEventType =
  | "login_success"
  | "login_fail"
  | "login_fail_mfa"
  | "password_change"
  | "password_reset_requested"
  | "password_reset_completed"
  | "mfa_enabled"
  | "mfa_disabled"
  | "invite_accepted"
  | "account_deactivated"
  | "account_reactivated";

export type AuthEventInput = {
  email: string;
  eventType: AuthEventType;
  userId?: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function logAuthEvent(input: AuthEventInput): Promise<void> {
  try {
    await db.insert(authEvents).values({
      userId: input.userId ?? null,
      email: input.email.toLowerCase().trim(),
      eventType: input.eventType,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to log auth event", {
      eventType: input.eventType,
      email: input.email,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export function extractIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

export function extractUserAgent(headers: Headers): string | null {
  const ua = headers.get("user-agent");
  if (!ua) return null;
  return ua.slice(0, 512);
}

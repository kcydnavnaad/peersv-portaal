"use server";

import { sendEmail } from "@/lib/email";
import { requireAdmin } from "./users";

/**
 * Test-action voor email verzending. Tijdelijk, voor V1.4 development.
 * Verwijder na MFA + password-reset features live zijn.
 */
export async function sendTestEmail(
  to: string,
): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  await requireAdmin();

  const result = await sendEmail({
    to,
    subject: "PeerSV Portaal — test email",
    html: `
      <p>Hallo,</p>
      <p>Dit is een test-email vanuit het PeerSV Portaal.</p>
      <p>Als je deze ontvangt, is de email infrastructuur correct geconfigureerd.</p>
      <p>—<br>PeerSV Portaal</p>
    `,
  });

  if (result.ok) {
    return { ok: true, messageId: result.messageId };
  }
  return { ok: false, error: result.error };
}

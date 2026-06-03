type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type SendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

function isWhitelisted(email: string): boolean {
  const whitelist = process.env.EMAIL_DEV_WHITELIST;
  if (!whitelist) return true;
  const allowed = whitelist.split(",").map((s) => s.trim().toLowerCase());
  return allowed.includes(email.toLowerCase());
}

/**
 * Stuur een email via SMTP2GO API.
 *
 * Veiligheid:
 * - Als EMAIL_DEV_WHITELIST gezet is, worden alleen emails op de whitelist
 *   echt verzonden. Andere emails worden gelogd en false geretourneerd.
 *   Bedoeld voor lokale ontwikkeling.
 * - Op productie laat je EMAIL_DEV_WHITELIST leeg en gaan alle emails door.
 */
export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const apiKey = process.env.SMTP2GO_API_KEY;
  if (!apiKey) {
    console.error("[email] SMTP2GO_API_KEY not configured");
    return { ok: false, error: "Email service not configured" };
  }

  const from = process.env.EMAIL_FROM ?? "noreply@webbaas.be";
  const fromName = process.env.EMAIL_FROM_NAME ?? "PeerSV Portaal";

  if (!isWhitelisted(params.to)) {
    console.log(
      `[email] BLOCKED by whitelist: would send to ${params.to}, subject: ${params.subject}`,
    );
    return { ok: false, error: "Recipient not in dev whitelist" };
  }

  try {
    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Smtp2go-Api-Key": apiKey,
      },
      body: JSON.stringify({
        sender: `${fromName} <${from}>`,
        to: [params.to],
        subject: params.subject,
        html_body: params.html,
        text_body: params.text ?? stripHtml(params.html),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[email] SMTP2GO API error:", response.status, body);
      return { ok: false, error: `SMTP2GO returned ${response.status}` };
    }

    const data = await response.json();
    const messageId =
      data?.data?.email_id ?? data?.data?.message_id ?? "unknown";

    console.log(`[email] sent to ${params.to}, id: ${messageId}`);
    return { ok: true, messageId };
  } catch (err) {
    console.error("[email] fetch failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Zeer basale HTML-naar-text fallback. Niet perfect, maar genoeg voor
 * de plain-text body van transactionele mails.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

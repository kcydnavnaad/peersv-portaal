export type EmailAttachment = {
  filename: string;
  fileblob: string; // base64-encoded content
  mimetype: string;
};

type SendEmailParams = {
  to: string;
  cc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
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

function normalizeCc(cc: string | string[] | undefined): string[] {
  if (!cc) return [];
  return Array.isArray(cc) ? cc : [cc];
}

/**
 * Stuur een email via SMTP2GO API.
 *
 * Veiligheid:
 * - Als EMAIL_DEV_WHITELIST gezet is, worden alleen emails op de whitelist
 *   echt verzonden. Andere emails (to OR cc) worden gelogd en blokkeren de
 *   send volledig. Bedoeld voor lokale ontwikkeling.
 * - Op productie laat je EMAIL_DEV_WHITELIST leeg en gaan alle emails door.
 *
 * Attachments: SMTP2GO verwacht base64-encoded fileblob + filename + mimetype.
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

  const ccList = normalizeCc(params.cc);
  const allRecipients = [params.to, ...ccList];
  const blocked = allRecipients.filter((addr) => !isWhitelisted(addr));
  if (blocked.length > 0) {
    console.log(
      `[email] BLOCKED by whitelist: would send to ${params.to}${
        ccList.length > 0 ? ` (cc: ${ccList.join(", ")})` : ""
      }, subject: ${params.subject}. Blocked addresses: ${blocked.join(", ")}`,
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
        cc: ccList.length > 0 ? ccList : undefined,
        subject: params.subject,
        html_body: params.html,
        text_body: params.text ?? stripHtml(params.html),
        attachments: params.attachments,
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

    console.log(
      `[email] sent to ${params.to}${
        ccList.length > 0 ? ` (cc: ${ccList.join(", ")})` : ""
      }, id: ${messageId}${
        params.attachments && params.attachments.length > 0
          ? `, attachments: ${params.attachments.length}`
          : ""
      }`,
    );
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

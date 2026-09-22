import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { performances } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import {
  buildPayoutsXlsx,
  PAYOUT_XLSX_CONTENT_TYPE,
} from "@/lib/payout-xlsx";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // 1. Auth via bearer token
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/monthly-payout] CRON_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secretarisEmail = process.env.SECRETARIS_EMAIL;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!secretarisEmail) {
    console.error("[cron/monthly-payout] SECRETARIS_EMAIL not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // 2. Bouw XLSX van alle open prestaties (geen maand-filter).
  const {
    buffer,
    filename,
    rowCount,
    totalAmount,
    monthLabel,
    performanceIds,
  } = await buildPayoutsXlsx();

  if (rowCount === 0 || performanceIds.length === 0) {
    console.log("[cron/monthly-payout] No open performances, skipping");
    return NextResponse.json({
      ok: true,
      count: 0,
      message: "No open performances",
    });
  }

  // 3. Mail met XLSX in bijlage.
  const xlsxBase64 = buffer.toString("base64");
  const formattedTotal = totalAmount.toFixed(2);

  const emailResult = await sendEmail({
    to: secretarisEmail,
    cc: adminEmail || undefined,
    subject: `PeerSV uitbetalingen — ${monthLabel}`,
    html: `
      <p>Hallo,</p>
      <p>Automatische export van openstaande prestaties.</p>
      <ul>
        <li>Aantal trainers: ${rowCount}</li>
        <li>Aantal prestaties: ${performanceIds.length}</li>
        <li>Totaal bedrag: € ${formattedTotal}</li>
      </ul>
      <p>Zie Excel-bijlage. Tab &lsquo;Overzicht&rsquo; bevat de rijen per
      trainer voor de bankverwerking; per trainer is er een detail-tab met
      alle prestaties. Alle prestaties zijn nu gemarkeerd als
      &lsquo;Doorgestuurd ter betaling&rsquo; in het portaal.</p>
      <p>Groeten,<br>PeerSV Portaal</p>
    `,
    attachments: [
      {
        filename,
        fileblob: xlsxBase64,
        mimetype: PAYOUT_XLSX_CONTENT_TYPE,
      },
    ],
  });

  if (!emailResult.ok) {
    console.error(
      "[cron/monthly-payout] Email failed, keeping status='open':",
      emailResult.error,
    );
    return NextResponse.json(
      { ok: false, error: emailResult.error },
      { status: 500 },
    );
  }

  // 4. Pas na succesvolle mail: promoot naar 'sent' met sent_by=NULL (systeem).
  const updated = await db
    .update(performances)
    .set({
      status: "sent",
      sentAt: new Date(),
      sentBy: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(performances.status, "open"),
        inArray(performances.id, performanceIds),
      ),
    )
    .returning({ id: performances.id });

  console.log(
    `[cron/monthly-payout] Success: ${updated.length} performances promoted to sent, mail delivered (messageId: ${emailResult.messageId})`,
  );

  return NextResponse.json({
    ok: true,
    count: updated.length,
    trainers: rowCount,
    totalAmount: formattedTotal,
    emailedTo: secretarisEmail,
    messageId: emailResult.messageId,
  });
}

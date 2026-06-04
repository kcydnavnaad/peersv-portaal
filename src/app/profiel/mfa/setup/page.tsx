import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  buildOtpauthUrl,
  generateMfaSecret,
  generateQrCodeSvg,
} from "@/lib/mfa";
import { enrollMfa } from "@/app/actions/mfa";
import { MfaSetupForm } from "./_components/mfa-setup-form";

export const dynamic = "force-dynamic";

export default async function MfaSetupPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  const userId = Number(session.user.id);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    redirect("/login");
  }

  if (user.mfaEnabled) {
    redirect("/profiel");
  }

  let secret = user.mfaSecret;
  if (!secret) {
    secret = generateMfaSecret();
    await db
      .update(users)
      .set({ mfaSecret: secret, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  const otpauthUrl = buildOtpauthUrl(user.email, secret);
  const qrSvg = await generateQrCodeSvg(otpauthUrl);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Tweefactor authenticatie instellen
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Voor extra beveiliging gebruik je naast je wachtwoord ook een code uit een
          authenticator app.
        </p>
      </div>

      <div className="max-w-2xl space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-base font-medium text-slate-900">
            Stap 1: Installeer een authenticator app
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Bijvoorbeeld <strong>Google Authenticator</strong>,{" "}
            <strong>Microsoft Authenticator</strong>, <strong>1Password</strong> of{" "}
            <strong>Authy</strong>.
          </p>
        </div>

        <div>
          <h2 className="text-base font-medium text-slate-900">
            Stap 2: Scan de QR-code
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Open je authenticator app en scan deze code:
          </p>
          <div className="mt-3 inline-block rounded-md border border-slate-200 bg-white p-3">
            <div
              dangerouslySetInnerHTML={{ __html: qrSvg }}
              className="[&_svg]:block [&_svg]:size-60"
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Lukt scannen niet? Voer dan handmatig deze code in je app in:
            <br />
            <code className="mt-1 inline-block rounded bg-slate-100 px-2 py-1 font-mono text-sm">
              {secret}
            </code>
          </p>
        </div>

        <div>
          <h2 className="text-base font-medium text-slate-900">
            Stap 3: Voer de code in die je app toont
          </h2>
          <MfaSetupForm action={enrollMfa} />
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { setupPassword } from "@/app/actions/setup";
import { validateToken } from "@/lib/tokens";
import { SetupPasswordForm } from "./_components/setup-password-form";

export const dynamic = "force-dynamic";

export default async function SetupPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const validated = await validateToken(token, "invite");

  let firstName: string | null = null;
  if (validated) {
    const [user] = await db
      .select({ firstName: users.firstName })
      .from(users)
      .where(eq(users.id, validated.userId))
      .limit(1);
    firstName = user?.firstName ?? null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Welkom bij PeerSV Portaal
          </h1>
          {firstName && (
            <p className="mt-2 text-sm text-slate-600">
              Hoi {firstName}, stel hieronder je wachtwoord in om te starten.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          {!validated ? (
            <div className="space-y-3">
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                Deze uitnodigingslink is ongeldig of verlopen. Vraag aan een
                admin om een nieuwe uitnodiging te sturen.
              </p>
              <Link
                href="/login"
                className="block rounded-md bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
              >
                Naar inloggen
              </Link>
            </div>
          ) : (
            <SetupPasswordForm token={token} action={setupPassword} />
          )}
        </div>
      </div>
    </div>
  );
}

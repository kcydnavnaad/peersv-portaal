import { sendTestEmail } from "@/app/actions/email-test";
import { EmailTestForm } from "./_components/email-test-form";

export default function EmailTestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Email test</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tijdelijke pagina voor V1.4 development. Stuur een test-email om te
          controleren dat de SMTP2GO integratie werkt.
        </p>
      </div>

      <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <EmailTestForm action={sendTestEmail} />
      </div>

      <p className="text-xs text-slate-500">
        Verwijder deze pagina (en /actions/email-test.ts) na V1.4 release.
      </p>
    </div>
  );
}

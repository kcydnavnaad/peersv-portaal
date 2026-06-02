import { getPaymentCapYearly } from "@/lib/payment-cap";
import { updateSettings } from "@/app/actions/settings";
import { SettingsForm } from "./_components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const currentCap = await getPaymentCapYearly();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Instellingen</h1>
        <p className="mt-1 text-sm text-slate-600">
          Beheer algemene instellingen van het portaal.
        </p>
      </div>

      <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <SettingsForm
          action={updateSettings}
          defaults={{ paymentCapYear: currentCap.toFixed(2) }}
        />
      </div>
    </div>
  );
}

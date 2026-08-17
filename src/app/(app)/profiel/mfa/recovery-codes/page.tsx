import { RecoveryCodesView } from "./_components/recovery-codes-view";

export const dynamic = "force-dynamic";

export default function RecoveryCodesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Bewaar je herstelcodes
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Tweefactor is geactiveerd. Hieronder vind je <strong>10 herstelcodes</strong>.
          Bewaar ze veilig (printen of in een wachtwoordmanager). Je kan elke code{" "}
          <strong>één keer</strong> gebruiken om in te loggen als je je telefoon kwijt
          bent.
        </p>
        <p className="mt-2 text-sm text-red-700">
          Deze codes worden maar één keer getoond. Sla ze nu op.
        </p>
      </div>

      <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <RecoveryCodesView />
      </div>
    </div>
  );
}

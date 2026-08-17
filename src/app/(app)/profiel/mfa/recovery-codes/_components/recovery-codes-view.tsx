"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function RecoveryCodesView() {
  const [codes, setCodes] = useState<string[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("mfa-recovery-codes");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        setCodes(parsed);
      } catch {
        setCodes([]);
      }
    } else {
      setCodes([]);
    }
  }, []);

  if (codes === null) {
    return <p className="text-sm text-slate-500">Laden...</p>;
  }

  if (codes.length === 0) {
    return (
      <div className="space-y-3">
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Geen herstelcodes gevonden in deze sessie. Codes zijn maar één keer
          zichtbaar na enrollment.
        </p>
        <Link
          href="/profiel"
          className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Terug naar profiel
        </Link>
      </div>
    );
  }

  function downloadCodes() {
    if (!codes) return;
    const text =
      `PeerSV Portaal — herstelcodes\n` +
      `Gegenereerd: ${new Date().toLocaleString("nl-BE")}\n\n` +
      codes.map((c, i) => `${i + 1}. ${c}`).join("\n") +
      `\n\nElke code kan één keer gebruikt worden bij inloggen.\n`;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "peersv-mfa-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleContinue() {
    sessionStorage.removeItem("mfa-recovery-codes");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-4 font-mono text-sm">
        {codes.map((code, i) => (
          <div key={i} className="px-2 py-1">
            {code}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={downloadCodes}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Download als bestand
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(codes.join("\n"));
          }}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Kopieer naar klembord
        </button>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        <span>Ik heb mijn herstelcodes opgeslagen op een veilige plek.</span>
      </label>

      <Link
        href="/profiel"
        onClick={handleContinue}
        className={`inline-block rounded-md px-4 py-2 text-sm font-medium text-white ${
          confirmed
            ? "bg-slate-900 hover:bg-slate-800"
            : "pointer-events-none bg-slate-300"
        }`}
      >
        Doorgaan naar profiel
      </Link>
    </div>
  );
}

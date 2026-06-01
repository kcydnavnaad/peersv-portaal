import Link from "next/link";
import { formatAmount } from "@/lib/performances";
import { getCapStatus, type CapStatus } from "@/lib/payment-cap";

type Props = {
  id: number;
  firstName: string;
  lastName: string;
  openMonth: string;
  paidMonth: string;
  yearTotal: string;
  monthLabel: string;
  year: number;
  cap: number;
};

function capBadge(status: CapStatus) {
  if (status === "exceeded") {
    return (
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-800">
        Plafond overschreden
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
        Bijna plafond
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
      OK
    </span>
  );
}

export function PayoutCard({
  id,
  firstName,
  lastName,
  openMonth,
  paidMonth,
  yearTotal,
  monthLabel,
  year,
  cap,
}: Props) {
  const status = getCapStatus(Number(yearTotal), cap);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="font-medium text-slate-900">
          {firstName} {lastName}
        </div>
        {capBadge(status)}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <dt className="text-slate-500">Open ({monthLabel})</dt>
        <dd className="text-right tabular-nums font-medium">
          {formatAmount(openMonth)}
        </dd>
        <dt className="text-slate-500">Betaald ({monthLabel})</dt>
        <dd className="text-right tabular-nums text-slate-600">
          {formatAmount(paidMonth)}
        </dd>
        <dt className="text-slate-500">Jaartotaal {year}</dt>
        <dd className="text-right tabular-nums text-slate-600">
          {formatAmount(yearTotal)}
        </dd>
      </dl>
      <div className="mt-3 flex justify-end">
        <Link
          href={`/admin/prestaties?trainer=${id}&period=month`}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
        >
          Bekijk prestaties
        </Link>
      </div>
    </div>
  );
}

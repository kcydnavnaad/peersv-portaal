type Performance = {
  id: number;
  date: string;
  type: string;
};

type MemberStats = {
  memberId: number;
  firstName: string;
  lastName: string;
  presentCount: number;
  absentCount: number;
  total: number;
  rate: number; // 0-100
};

type AttendanceCell = "present" | "absent" | null;

type Props = {
  performances: Performance[];
  memberStats: MemberStats[];
  matrix: Map<string, AttendanceCell>; // key: "memberId-performanceId"
};

const performanceTypeLabel: Record<string, string> = {
  training: "T",
  match: "W",
  tournament: "T*",
};

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function TeamAttendanceSection({
  performances,
  memberStats,
  matrix,
}: Props) {
  if (memberStats.length === 0) {
    return (
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-medium">Aanwezigheden</h2>
        </header>
        <p className="px-4 py-6 text-sm text-slate-500">
          Geen actieve leden in dit team.
        </p>
      </section>
    );
  }

  if (performances.length === 0) {
    return (
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-medium">Aanwezigheden</h2>
        </header>
        <p className="px-4 py-6 text-sm text-slate-500">
          Nog geen prestaties met aanwezigheden voor dit team.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-medium">Aanwezigheden</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Statistieken over de laatste {performances.length} prestaties.
        </p>
      </header>

      {/* Statistieken per lid */}
      <ul className="divide-y divide-slate-100">
        {memberStats.map((m) => (
          <li
            key={m.memberId}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <span className="text-sm font-medium text-slate-900">
              {m.firstName} {m.lastName}
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              {m.total === 0 ? (
                <span>Geen data</span>
              ) : (
                <>
                  <span>
                    {m.presentCount}/{m.total} aanwezig
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      m.rate >= 75
                        ? "bg-emerald-50 text-emerald-800"
                        : m.rate >= 50
                          ? "bg-amber-50 text-amber-800"
                          : "bg-red-50 text-red-800"
                    }`}
                  >
                    {m.rate}%
                  </span>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Matrix */}
      <details className="border-t border-slate-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Toon detail per prestatie
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2">
                  Lid
                </th>
                {performances.map((p) => (
                  <th
                    key={p.id}
                    className="whitespace-nowrap px-2 py-2 text-center"
                    title={`${p.type} - ${p.date}`}
                  >
                    <div>{formatShortDate(p.date)}</div>
                    <div className="text-[10px] font-normal text-slate-400">
                      {performanceTypeLabel[p.type] ?? p.type}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberStats.map((m) => (
                <tr key={m.memberId}>
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-900">
                    {m.firstName} {m.lastName}
                  </td>
                  {performances.map((p) => {
                    const cell = matrix.get(`${m.memberId}-${p.id}`);
                    return (
                      <td
                        key={p.id}
                        className="px-2 py-2 text-center"
                      >
                        {cell === "present" ? (
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                        ) : cell === "absent" ? (
                          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                        ) : (
                          <span className="text-slate-300">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

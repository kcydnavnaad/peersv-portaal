import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { formatIban, formatRate } from "@/lib/trainers";
import { TrainerRow } from "./_components/trainer-row";

export const dynamic = "force-dynamic";

export default async function TrainersListPage() {
  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      trainerRate: users.trainerRate,
      isButterfly: users.isButterfly,
      iban: users.iban,
    })
    .from(users)
    .where(eq(users.role, "trainer"))
    .orderBy(asc(users.lastName), asc(users.firstName));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Trainers</h1>
        <p className="mt-1 text-sm text-slate-600">
          {rows.length}{" "}
          {rows.length === 1 ? "trainer" : "trainers"} in het systeem.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Nog geen trainers.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3 text-right">Tarief</th>
                <th className="px-4 py-3">Vlinder</th>
                <th className="px-4 py-3">IBAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((t) => (
                <TrainerRow key={t.id} id={t.id}>
                  <td className="px-4 py-3 font-medium">
                    {t.firstName} {t.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.email}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatRate(t.trainerRate)}
                  </td>
                  <td className="px-4 py-3">
                    {t.isButterfly ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                        Vlinder
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 tabular-nums">
                    {formatIban(t.iban)}
                  </td>
                </TrainerRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

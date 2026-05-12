import { desc } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  active: "Actief",
  inactive: "Inactief",
  pending: "In aanvraag",
};

export default async function LedenPage() {
  const rows = await db
    .select()
    .from(members)
    .orderBy(desc(members.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Leden</h1>
          <p className="mt-1 text-sm text-slate-600">
            {rows.length} {rows.length === 1 ? "lid" : "leden"} geregistreerd.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Nog geen leden. Run{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
            npm run db:seed
          </code>{" "}
          om voorbeelddata te laden.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Ploeg</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    {m.firstName} {m.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.email ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{m.team ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {statusLabel[m.status] ?? m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

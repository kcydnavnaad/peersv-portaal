import Link from "next/link";
import { and, asc, eq, isNull, isNotNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { formatIban, formatRate } from "@/lib/trainers";
import { UserRow } from "./_components/user-row";

export const dynamic = "force-dynamic";

type ViewMode = "active" | "deactivated" | "all";
type RoleFilter = "all" | "admin" | "trainer";

export default async function UsersListPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; role?: string; created?: string }>;
}) {
  const sp = await searchParams;
  const view: ViewMode =
    sp.view === "deactivated" || sp.view === "all" ? sp.view : "active";
  const roleFilter: RoleFilter =
    sp.role === "admin" || sp.role === "trainer" ? sp.role : "all";
  const created = sp.created === "1";

  const conditions: SQL[] = [];
  if (roleFilter !== "all") {
    conditions.push(eq(users.role, roleFilter));
  }
  if (view === "active") {
    conditions.push(isNull(users.deactivatedAt));
  } else if (view === "deactivated") {
    conditions.push(isNotNull(users.deactivatedAt));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      trainerRate: users.trainerRate,
      isButterfly: users.isButterfly,
      iban: users.iban,
      deactivatedAt: users.deactivatedAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(whereClause)
    .orderBy(asc(users.role), asc(users.lastName), asc(users.firstName));

  const labelMap: Record<ViewMode, string> = {
    active: "actief",
    deactivated: "gedeactiveerd",
    all: "alle statussen",
  };
  const roleLabelMap: Record<RoleFilter, string> = {
    all: "alle rollen",
    admin: "admins",
    trainer: "trainers",
  };

  return (
    <div className="space-y-6">
      {created && (
        <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Gebruiker aangemaakt. Vergeet niet het initiële wachtwoord door te geven.
        </p>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Gebruikers</h1>
          <p className="mt-1 text-sm text-slate-600">
            {rows.length}{" "}
            {rows.length === 1 ? "gebruiker" : "gebruikers"} ({roleLabelMap[roleFilter]}, {labelMap[view]}).
          </p>
        </div>
        <Link
          href="/admin/users/nieuw"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Nieuwe gebruiker
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Rol:</span>
          <FilterLink current={roleFilter} target="all" param="role" view={view} label="Alle" />
          <FilterLink current={roleFilter} target="admin" param="role" view={view} label="Admins" />
          <FilterLink current={roleFilter} target="trainer" param="role" view={view} label="Trainers" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Status:</span>
          <ViewLink current={view} target="active" role={roleFilter} label="Actief" />
          <ViewLink current={view} target="deactivated" role={roleFilter} label="Gedeactiveerd" />
          <ViewLink current={view} target="all" role={roleFilter} label="Alles" />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Geen gebruikers gevonden met deze filters.
        </div>
      ) : (
        <>
          {/* Desktop: tabel */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Naam</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3 text-right">Tarief</th>
                  <th className="px-4 py-3">Vlinder</th>
                  <th className="px-4 py-3">IBAN</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Laatst ingelogd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((u) => {
                  const isDeactivated = u.deactivatedAt !== null;
                  const isTrainer = u.role === "trainer";
                  const rowClass = isDeactivated ? "opacity-60" : "";
                  const href = isTrainer ? `/admin/trainers/${u.id}` : null;

                  return (
                    <UserRow key={u.id} href={href}>
                      <td className={`px-4 py-3 font-medium ${rowClass}`}>
                        {u.firstName} {u.lastName}
                      </td>
                      <td className={`px-4 py-3 ${rowClass}`}>
                        {u.role === "admin" ? (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                            Admin
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                            Trainer
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-slate-600 ${rowClass}`}>
                        {u.email}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums text-slate-700 ${rowClass}`}>
                        {isTrainer ? formatRate(u.trainerRate) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className={`px-4 py-3 ${rowClass}`}>
                        {isTrainer && u.isButterfly ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                            Vlinder
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-slate-600 tabular-nums ${rowClass}`}>
                        {isTrainer ? formatIban(u.iban) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {isDeactivated ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                            Gedeactiveerd
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                            Actief
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-slate-600 text-xs ${rowClass}`}>
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString("nl-BE", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </UserRow>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {rows.map((u) => {
              const isDeactivated = u.deactivatedAt !== null;
              const isTrainer = u.role === "trainer";
              const cardBody = (
                <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${isDeactivated ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{u.firstName} {u.lastName}</div>
                      <div className="text-sm text-slate-600">{u.email}</div>
                    </div>
                    {u.role === "admin" ? (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 shrink-0">
                        Admin
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 shrink-0">
                        Trainer
                      </span>
                    )}
                  </div>
                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    {isTrainer && (
                      <>
                        <dt className="text-slate-500">Tarief</dt>
                        <dd className="text-right text-slate-700 tabular-nums">
                          {formatRate(u.trainerRate)}
                        </dd>
                        <dt className="text-slate-500">IBAN</dt>
                        <dd className="text-right text-slate-600 tabular-nums text-xs">
                          {formatIban(u.iban)}
                        </dd>
                      </>
                    )}
                    <dt className="text-slate-500">Status</dt>
                    <dd className="text-right">
                      {isDeactivated ? (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                          Gedeactiveerd
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                          Actief
                        </span>
                      )}
                    </dd>
                    <dt className="text-slate-500">Laatst ingelogd</dt>
                    <dd className="text-right text-slate-600 text-xs">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleString("nl-BE", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </dd>
                  </dl>
                </div>
              );
              return isTrainer ? (
                <Link key={u.id} href={`/admin/trainers/${u.id}`} className="block">
                  {cardBody}
                </Link>
              ) : (
                <div key={u.id}>{cardBody}</div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function buildHref(role: RoleFilter, view: ViewMode): string {
  const params = new URLSearchParams();
  if (role !== "all") params.set("role", role);
  if (view !== "active") params.set("view", view);
  const qs = params.toString();
  return qs ? `/admin/users?${qs}` : "/admin/users";
}

function FilterLink({
  current,
  target,
  param,
  view,
  label,
}: {
  current: RoleFilter;
  target: RoleFilter;
  param: "role";
  view: ViewMode;
  label: string;
}) {
  const active = current === target;
  const href = buildHref(target, view);
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white"
          : "rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
      }
    >
      {label}
    </Link>
  );
}

function ViewLink({
  current,
  target,
  role,
  label,
}: {
  current: ViewMode;
  target: ViewMode;
  role: RoleFilter;
  label: string;
}) {
  const active = current === target;
  const href = buildHref(role, target);
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white"
          : "rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
      }
    >
      {label}
    </Link>
  );
}

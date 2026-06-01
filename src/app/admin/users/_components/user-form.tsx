"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { generateReadablePassword } from "@/lib/password";
import type { UserFormState, UserRole } from "@/lib/users";

type Props = {
  action: (
    state: UserFormState,
    fd: FormData,
  ) => Promise<UserFormState>;
  cancelHref: string;
};

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const labelCls = "block text-sm font-medium text-slate-700";
const errorCls = "mt-1 text-xs text-red-600";

export function UserForm({ action, cancelHref }: Props) {
  const [state, formAction, isPending] = useActionState<UserFormState, FormData>(
    action,
    {},
  );

  const [role, setRole] = useState<UserRole>("trainer");
  const [passwordValue, setPasswordValue] = useState("");

  const v = (key: string, fallback?: string | null) =>
    state.values?.[key] ?? fallback ?? "";

  const butterflyChecked =
    state.values?.isButterfly !== undefined
      ? state.values.isButterfly === "on"
      : false;

  function handleGeneratePassword() {
    setPasswordValue(generateReadablePassword());
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {/* Rol selector */}
      <div>
        <span className={labelCls}>Rol *</span>
        <div className="mt-2 flex gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">
            <input
              type="radio"
              name="role"
              value="trainer"
              checked={role === "trainer"}
              onChange={() => setRole("trainer")}
              className="size-4"
            />
            <span>Trainer</span>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">
            <input
              type="radio"
              name="role"
              value="admin"
              checked={role === "admin"}
              onChange={() => setRole("admin")}
              className="size-4"
            />
            <span>Admin</span>
          </label>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {role === "admin"
            ? "Een admin heeft volledige toegang tot het beheer."
            : "Een trainer kan prestaties registreren voor zijn/haar teams."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelCls}>
            Voornaam *
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            defaultValue={v("firstName")}
            className={inputCls}
          />
          {state.errors?.firstName && (
            <p className={errorCls}>{state.errors.firstName}</p>
          )}
        </div>
        <div>
          <label htmlFor="lastName" className={labelCls}>
            Achternaam *
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            defaultValue={v("lastName")}
            className={inputCls}
          />
          {state.errors?.lastName && (
            <p className={errorCls}>{state.errors.lastName}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelCls}>
            E-mail *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={v("email")}
            className={inputCls}
          />
          {state.errors?.email && (
            <p className={errorCls}>{state.errors.email}</p>
          )}
        </div>
        <div>
          <label htmlFor="phone" className={labelCls}>
            Telefoon
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={v("phone")}
            className={inputCls}
          />
          {state.errors?.phone && (
            <p className={errorCls}>{state.errors.phone}</p>
          )}
        </div>
      </div>

      {/* Trainer-specifieke velden, alleen tonen bij role=trainer */}
      {role === "trainer" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="trainerRate" className={labelCls}>
                Tarief (€)
              </label>
              <input
                id="trainerRate"
                name="trainerRate"
                type="text"
                inputMode="decimal"
                placeholder="25,00"
                defaultValue={v("trainerRate")}
                className={inputCls}
              />
              {state.errors?.trainerRate && (
                <p className={errorCls}>{state.errors.trainerRate}</p>
              )}
            </div>
            <div>
              <label htmlFor="iban" className={labelCls}>
                IBAN
              </label>
              <input
                id="iban"
                name="iban"
                type="text"
                placeholder="BE68 5390 0754 7034"
                defaultValue={v("iban")}
                className={inputCls}
              />
              {state.errors?.iban && (
                <p className={errorCls}>{state.errors.iban}</p>
              )}
            </div>
          </div>

          <div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="isButterfly"
                defaultChecked={butterflyChecked}
                className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <span>Is vlinder (mag voor alle teams prestaties loggen)</span>
            </label>
          </div>
        </>
      )}

      {/* Wachtwoord met genereer-knop */}
      <div>
        <label htmlFor="password" className={labelCls}>
          Initieel wachtwoord *
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="password"
            name="password"
            type="text"
            required
            minLength={8}
            value={passwordValue}
            onChange={(e) => setPasswordValue(e.target.value)}
            className={inputCls}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={handleGeneratePassword}
            className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            Genereer
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Minstens 8 karakters. Geef dit door aan de gebruiker; je ziet het
          nadien niet meer.
        </p>
        {state.errors?.password && (
          <p className={errorCls}>{state.errors.password}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
        <Link
          href={cancelHref}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          Annuleren
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? "Bezig..." : "Aanmaken"}
        </button>
      </div>
    </form>
  );
}

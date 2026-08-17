import Link from "next/link";
import { createUser } from "@/app/actions/users";
import type { UserFormState, UserRole } from "@/lib/users";
import { UserForm } from "../_components/user-form";

export default function NewUserPage() {
  async function handleCreate(
    _prev: UserFormState,
    formData: FormData,
  ): Promise<UserFormState> {
    "use server";
    const roleValue = formData.get("role");
    const role: UserRole =
      roleValue === "admin" || roleValue === "trainer" ? roleValue : "trainer";
    return createUser(role, _prev, formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="text-sm text-slate-500 hover:underline"
        >
          ← Terug naar gebruikers
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Nieuwe gebruiker
        </h1>
      </div>

      <UserForm action={handleCreate} cancelHref="/admin/users" />
    </div>
  );
}

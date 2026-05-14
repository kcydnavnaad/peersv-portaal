"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import {
  flattenZodErrors,
  parseTeamForm,
  valuesFromFormData,
  type TeamFormState,
} from "@/lib/teams";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

const duplicateError = (formData: FormData): TeamFormState => ({
  errors: { name: "Er bestaat al een team met deze naam in dit seizoen" },
  values: valuesFromFormData(formData),
});

export async function createTeam(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  await requireAdmin();

  const parsed = parseTeamForm(formData);
  if (!parsed.success) {
    return {
      errors: flattenZodErrors(parsed.error),
      values: valuesFromFormData(formData),
    };
  }

  try {
    await db.insert(teams).values(parsed.data);
  } catch (err) {
    if (isUniqueViolation(err)) return duplicateError(formData);
    throw err;
  }

  revalidatePath("/admin/teams");
  redirect("/admin/teams");
}

export async function updateTeam(
  id: number,
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  await requireAdmin();

  const parsed = parseTeamForm(formData);
  if (!parsed.success) {
    return {
      errors: flattenZodErrors(parsed.error),
      values: valuesFromFormData(formData),
    };
  }

  try {
    await db.update(teams).set(parsed.data).where(eq(teams.id, id));
  } catch (err) {
    if (isUniqueViolation(err)) return duplicateError(formData);
    throw err;
  }

  revalidatePath("/admin/teams");
  revalidatePath(`/admin/teams/${id}`);
  redirect(`/admin/teams/${id}`);
}

export async function deleteTeam(id: number) {
  await requireAdmin();
  await db.delete(teams).where(eq(teams.id, id));
  revalidatePath("/admin/teams");
  redirect("/admin/teams");
}

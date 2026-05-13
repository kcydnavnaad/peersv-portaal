"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { members } from "@/db/schema";
import {
  flattenZodErrors,
  parseMemberForm,
  valuesFromFormData,
  type MemberFormState,
} from "@/lib/members";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function isUniqueViolation(err: unknown): boolean {
  const has23505 = (e: unknown): boolean =>
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: unknown }).code === "23505";

  if (has23505(err)) return true;
  // Drizzle wraps postgres-js errors in DrizzleQueryError; the PostgresError sits on `cause`.
  if (typeof err === "object" && err !== null && "cause" in err) {
    return has23505((err as { cause: unknown }).cause);
  }
  return false;
}

export async function createMember(
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await requireAdmin();

  const parsed = parseMemberForm(formData);
  if (!parsed.success) {
    return {
      errors: flattenZodErrors(parsed.error),
      values: valuesFromFormData(formData),
    };
  }

  try {
    await db.insert(members).values(parsed.data);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        errors: { email: "Dit e-mailadres bestaat al" },
        values: valuesFromFormData(formData),
      };
    }
    throw err;
  }

  revalidatePath("/leden");
  redirect("/leden");
}

export async function updateMember(
  id: number,
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await requireAdmin();

  const parsed = parseMemberForm(formData);
  if (!parsed.success) {
    return {
      errors: flattenZodErrors(parsed.error),
      values: valuesFromFormData(formData),
    };
  }

  try {
    await db
      .update(members)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(members.id, id));
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        errors: { email: "Dit e-mailadres bestaat al" },
        values: valuesFromFormData(formData),
      };
    }
    throw err;
  }

  revalidatePath("/leden");
  revalidatePath(`/leden/${id}`);
  redirect(`/leden/${id}`);
}

export async function deleteMember(id: number) {
  await requireAdmin();
  await db.delete(members).where(eq(members.id, id));
  revalidatePath("/leden");
  redirect("/leden");
}

"use server";

import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import {
  flattenZodErrors,
  parseUserCreateForm,
  valuesFromUserFormData,
  type UserFormState,
  type UserRole,
} from "@/lib/users";
import {
  parseTrainerCreateForm,
  valuesFromFormData as valuesFromTrainerFormData,
} from "@/lib/trainers";

export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

export async function createUser(
  role: UserRole,
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin();

  // Voor trainers gebruiken we het uitgebreide schema (met IBAN/tarief/vlinder).
  // Voor admins gebruiken we het basis-schema.
  if (role === "trainer") {
    const parsed = parseTrainerCreateForm(formData);
    if (!parsed.success) {
      return {
        errors: flattenZodErrors(parsed.error),
        values: valuesFromTrainerFormData(formData),
      };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    let createdId: number;
    try {
      const [created] = await db
        .insert(users)
        .values({
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          email: parsed.data.email,
          phone: parsed.data.phone,
          trainerRate: parsed.data.trainerRate,
          isButterfly: parsed.data.isButterfly,
          iban: parsed.data.iban,
          passwordHash,
          role: "trainer",
        })
        .returning({ id: users.id });
      createdId = created.id;
    } catch (err) {
      if (isUniqueViolation(err)) {
        return {
          errors: { email: "Dit e-mailadres is al in gebruik" },
          values: valuesFromTrainerFormData(formData),
        };
      }
      throw err;
    }

    revalidatePath("/admin/trainers");
    revalidatePath("/admin/users");
    redirect(`/admin/trainers/${createdId}?created=1`);
  }

  // role === "admin"
  const parsed = parseUserCreateForm(formData);
  if (!parsed.success) {
    return {
      errors: flattenZodErrors(parsed.error),
      values: valuesFromUserFormData(formData),
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  let createdId: number;
  try {
    const [created] = await db
      .insert(users)
      .values({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        passwordHash,
        role: "admin",
      })
      .returning({ id: users.id });
    createdId = created.id;
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        errors: { email: "Dit e-mailadres is al in gebruik" },
        values: valuesFromUserFormData(formData),
      };
    }
    throw err;
  }

  revalidatePath("/admin/users");
  redirect(`/admin/users?created=1`);
}

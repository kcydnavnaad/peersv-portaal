"use server";

import bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import {
  flattenZodErrors,
  parseTrainerCreateForm,
  parseTrainerUpdateForm,
  valuesFromFormData,
  type TrainerFormState,
} from "@/lib/trainers";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

export async function createTrainer(
  _prev: TrainerFormState,
  formData: FormData,
): Promise<TrainerFormState> {
  await requireAdmin();

  const parsed = parseTrainerCreateForm(formData);
  if (!parsed.success) {
    return {
      errors: flattenZodErrors(parsed.error),
      values: valuesFromFormData(formData),
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
        values: valuesFromFormData(formData),
      };
    }
    throw err;
  }

  revalidatePath("/admin/trainers");
  redirect(`/admin/trainers/${createdId}?created=1`);
}

export async function updateTrainer(
  id: number,
  _prev: TrainerFormState,
  formData: FormData,
): Promise<TrainerFormState> {
  await requireAdmin();

  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, "trainer")))
    .limit(1);

  if (!existing) {
    return { message: "Trainer niet gevonden." };
  }

  const parsed = parseTrainerUpdateForm(formData);
  if (!parsed.success) {
    return {
      errors: flattenZodErrors(parsed.error),
      values: valuesFromFormData(formData),
    };
  }

  try {
    await db
      .update(users)
      .set({
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        trainerRate: parsed.data.trainerRate,
        isButterfly: parsed.data.isButterfly,
        iban: parsed.data.iban,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        errors: { email: "Dit e-mailadres is al in gebruik" },
        values: valuesFromFormData(formData),
      };
    }
    throw err;
  }

  revalidatePath("/admin/trainers");
  revalidatePath(`/admin/trainers/${id}`);
  redirect(`/admin/trainers/${id}`);
}

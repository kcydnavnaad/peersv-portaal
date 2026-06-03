"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { sendEmail } from "@/lib/email";
import { createToken } from "@/lib/tokens";
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

async function sendInviteEmail(params: {
  userId: number;
  email: string;
  firstName: string;
}): Promise<void> {
  const token = await createToken(params.userId, "invite");
  const baseUrl = process.env.EMAIL_BASE_URL ?? "http://localhost:3000";
  const setupUrl = `${baseUrl}/setup/${token}`;

  const html = `
    <p>Hallo ${params.firstName},</p>
    <p>Je hebt een account gekregen voor het PeerSV Portaal.</p>
    <p>
      Klik op onderstaande link om je wachtwoord in te stellen en te beginnen.
      Deze link is geldig voor 7 dagen.
    </p>
    <p><a href="${setupUrl}">${setupUrl}</a></p>
    <p>Heb je vragen? Neem contact op met de admin die je heeft aangemaakt.</p>
    <p>—<br>PeerSV Portaal</p>
  `;

  await sendEmail({
    to: params.email,
    subject: "PeerSV Portaal — stel je wachtwoord in",
    html,
  });
}

export async function createUser(
  role: UserRole,
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin();

  const inviteMode = formData.get("inviteMode") === "invite";

  // Voor trainers gebruiken we het uitgebreide schema (met IBAN/tarief/vlinder).
  // Voor admins gebruiken we het basis-schema.
  if (role === "trainer") {
    let parsed;
    if (inviteMode) {
      // In invite mode: password is niet vereist, dus gebruik een loser schema.
      // We hergebruiken trainerUpdateSchema (zonder password) en voegen daarna handmatig een dummy password toe.
      const { parseTrainerUpdateForm } = await import("@/lib/trainers");
      parsed = parseTrainerUpdateForm(formData);
    } else {
      parsed = parseTrainerCreateForm(formData);
    }

    if (!parsed.success) {
      return {
        errors: flattenZodErrors(parsed.error),
        values: valuesFromTrainerFormData(formData),
      };
    }

    // Genereer password hash: echte wachtwoord (direct mode) of throwaway (invite mode)
    const passwordHash = inviteMode
      ? await bcrypt.hash(randomBytes(32).toString("hex"), 10)
      : await bcrypt.hash(
          (parsed.data as unknown as { password: string }).password,
          10,
        );

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

    if (inviteMode) {
      await sendInviteEmail({
        userId: createdId,
        email: parsed.data.email,
        firstName: parsed.data.firstName,
      });
    }

    revalidatePath("/admin/trainers");
    revalidatePath("/admin/users");
    const params = inviteMode ? "?created=1&invited=1" : "?created=1";
    redirect(`/admin/trainers/${createdId}${params}`);
  }

  // role === "admin"
  let parsed;
  if (inviteMode) {
    const { userUpdateBaseSchema } = await import("@/lib/users");
    parsed = userUpdateBaseSchema.safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
    });
  } else {
    parsed = parseUserCreateForm(formData);
  }

  if (!parsed.success) {
    return {
      errors: flattenZodErrors(parsed.error),
      values: valuesFromUserFormData(formData),
    };
  }

  const passwordHash = inviteMode
    ? await bcrypt.hash(randomBytes(32).toString("hex"), 10)
    : await bcrypt.hash(
        (parsed.data as unknown as { password: string }).password,
        10,
      );

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

  if (inviteMode) {
    await sendInviteEmail({
      userId: createdId,
      email: parsed.data.email,
      firstName: parsed.data.firstName,
    });
  }

  revalidatePath("/admin/users");
  const adminParams = inviteMode ? "?created=1&invited=1" : "?created=1";
  redirect(`/admin/users${adminParams}`);
}

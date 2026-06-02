"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { settings } from "@/db/schema";
import {
  flattenSettingsErrors,
  parseSettingsUpdateForm,
  type SettingsFormState,
} from "@/lib/settings";
import { requireAdmin } from "./users";

export async function updateSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  await requireAdmin();

  const parsed = parseSettingsUpdateForm(formData);
  if (!parsed.success) {
    return {
      errors: flattenSettingsErrors(parsed.error),
      values: {
        paymentCapYear: String(formData.get("paymentCapYear") ?? ""),
      },
    };
  }

  // Update payment_cap_year. Upsert pattern.
  const existing = await db
    .select({ key: settings.key })
    .from(settings)
    .where(eq(settings.key, "payment_cap_year"))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(settings)
      .set({ value: parsed.data.paymentCapYear })
      .where(eq(settings.key, "payment_cap_year"));
  } else {
    await db.insert(settings).values({
      key: "payment_cap_year",
      value: parsed.data.paymentCapYear,
    });
  }

  revalidatePath("/admin/instellingen");
  revalidatePath("/admin/uitbetalingen");

  return {
    success: true,
    message: "Instellingen opgeslagen.",
    values: {
      paymentCapYear: parsed.data.paymentCapYear,
    },
  };
}

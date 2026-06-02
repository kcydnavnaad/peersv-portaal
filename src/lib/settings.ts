import { z } from "zod";

export const settingsUpdateSchema = z.object({
  paymentCapYear: z
    .string()
    .trim()
    .min(1, "Bedrag is verplicht")
    .refine(
      (v) => /^\d+([.,]\d{1,2})?$/.test(v),
      "Ongeldig bedrag (bijv. 3233 of 3233,91)",
    )
    .transform((v) => Number(v.replace(",", ".")).toFixed(2)),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

export type SettingsFormState = {
  errors?: Partial<Record<keyof SettingsUpdateInput, string>>;
  message?: string;
  success?: boolean;
  values?: Record<string, string>;
};

export function parseSettingsUpdateForm(formData: FormData) {
  return settingsUpdateSchema.safeParse({
    paymentCapYear: formData.get("paymentCapYear"),
  });
}

export function flattenSettingsErrors(
  error: z.ZodError<SettingsUpdateInput>,
): SettingsFormState["errors"] {
  const out: SettingsFormState["errors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof SettingsUpdateInput | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

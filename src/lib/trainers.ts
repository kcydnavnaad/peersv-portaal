import { z } from "zod";

const optionalString = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((v) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null,
  );

function cleanIban(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export const trainerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Voornaam is verplicht")
    .max(100, "Maximaal 100 tekens"),
  lastName: z
    .string()
    .trim()
    .min(1, "Achternaam is verplicht")
    .max(100, "Maximaal 100 tekens"),
  email: z
    .string()
    .trim()
    .min(1, "E-mail is verplicht")
    .email("Ongeldig e-mailadres")
    .max(255, "Maximaal 255 tekens"),
  phone: optionalString.pipe(
    z.string().max(50, "Maximaal 50 tekens").nullable(),
  ),
  trainerRate: optionalString.pipe(
    z
      .string()
      .nullable()
      .refine(
        (v) => v === null || /^\d+([.,]\d{1,2})?$/.test(v),
        "Ongeldig bedrag (bijv. 25 of 25,00)",
      )
      .transform((v) =>
        v === null ? null : Number(v.replace(",", ".")).toFixed(2),
      ),
  ),
  isButterfly: z
    .union([z.literal("on"), z.literal("true"), z.string(), z.undefined(), z.null()])
    .transform((v) => v === "on" || v === "true"),
  iban: optionalString.pipe(
    z
      .string()
      .nullable()
      .refine(
        (v) => v === null || /^BE\d{14}$/.test(cleanIban(v)),
        "Ongeldig BE IBAN (BE + 14 cijfers, spaties zijn ok)",
      )
      .transform((v) => (v === null ? null : cleanIban(v))),
  ),
});

export type TrainerInput = z.infer<typeof trainerSchema>;

export type TrainerFormState = {
  errors?: Partial<Record<keyof TrainerInput, string>>;
  message?: string;
  values?: Record<string, string>;
};

export function parseTrainerForm(formData: FormData) {
  const raw = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    trainerRate: formData.get("trainerRate"),
    isButterfly: formData.get("isButterfly"),
    iban: formData.get("iban"),
  };
  return trainerSchema.safeParse(raw);
}

export function flattenZodErrors(
  error: z.ZodError<TrainerInput>,
): TrainerFormState["errors"] {
  const out: TrainerFormState["errors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof TrainerInput | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export function valuesFromFormData(formData: FormData): Record<string, string> {
  return {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    trainerRate: String(formData.get("trainerRate") ?? ""),
    isButterfly: formData.get("isButterfly") === "on" ? "on" : "",
    iban: String(formData.get("iban") ?? ""),
  };
}

export function formatIban(value: string | null): string {
  if (!value) return "—";
  const cleaned = cleanIban(value);
  return cleaned.replace(/(.{4})/g, "$1 ").trim();
}

export function formatRate(value: string | null): string {
  if (value == null) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

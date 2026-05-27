import { z } from "zod";

const optionalString = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null));

const today = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

export const memberSchema = z.object({
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
  email: optionalString.pipe(
    z
      .string()
      .email("Ongeldig e-mailadres")
      .max(255, "Maximaal 255 tekens")
      .nullable(),
  ),
  phone: optionalString.pipe(
    z.string().max(50, "Maximaal 50 tekens").nullable(),
  ),
  birthDate: optionalString.pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum")
      .refine(
        (v) => new Date(v) <= today(),
        "Geboortedatum kan niet in de toekomst liggen",
      )
      .nullable(),
  ),
  status: z.enum(["active", "inactive", "pending"]),
});

export type MemberInput = z.infer<typeof memberSchema>;

export type MemberFormState = {
  errors?: Partial<Record<keyof MemberInput, string>>;
  message?: string;
  values?: Record<string, string>;
};

export function parseMemberForm(formData: FormData) {
  const raw = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    birthDate: formData.get("birthDate"),
    status: formData.get("status") ?? "active",
  };
  return memberSchema.safeParse(raw);
}

export function flattenZodErrors(
  error: z.ZodError<MemberInput>,
): MemberFormState["errors"] {
  const out: MemberFormState["errors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof MemberInput | undefined;
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
    birthDate: String(formData.get("birthDate") ?? ""),
    status: String(formData.get("status") ?? "active"),
  };
}

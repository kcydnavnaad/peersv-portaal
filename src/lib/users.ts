import { z } from "zod";

export const optionalString = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((v) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null,
  );

export const userRoleSchema = z.enum(["admin", "trainer"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userUpdateBaseSchema = z.object({
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
});

export const userCreateBaseSchema = userUpdateBaseSchema.extend({
  password: z
    .string()
    .min(8, "Wachtwoord moet minstens 8 karakters zijn")
    .max(200, "Maximaal 200 tekens"),
});

export type UserUpdateBaseInput = z.infer<typeof userUpdateBaseSchema>;
export type UserCreateBaseInput = z.infer<typeof userCreateBaseSchema>;

export type UserFormState = {
  errors?: Record<string, string>;
  message?: string;
  values?: Record<string, string>;
};

export function flattenZodErrors(
  error: z.ZodError,
): UserFormState["errors"] {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as string | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

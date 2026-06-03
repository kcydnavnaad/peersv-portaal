import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "E-mail is verplicht")
    .email("Ongeldig e-mailadres")
    .max(255),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Wachtwoord moet minstens 8 karakters zijn")
    .max(200, "Maximaal 200 tekens"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Wachtwoorden komen niet overeen",
  path: ["confirmPassword"],
});

export type AuthFormState = {
  errors?: Record<string, string>;
  message?: string;
  success?: boolean;
  values?: Record<string, string>;
};

export function flattenAuthErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as string | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

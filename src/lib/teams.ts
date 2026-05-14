import { z } from "zod";

const optionalString = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((v) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null,
  );

export const teamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Naam is verplicht")
    .max(100, "Maximaal 100 tekens"),
  category: optionalString.pipe(
    z.string().max(100, "Maximaal 100 tekens").nullable(),
  ),
  seasonId: z.coerce.number().int().positive("Seizoen is verplicht"),
});

export type TeamInput = z.infer<typeof teamSchema>;

export type TeamFormState = {
  errors?: Partial<Record<keyof TeamInput, string>>;
  message?: string;
  values?: Record<string, string>;
};

export function parseTeamForm(formData: FormData) {
  const raw = {
    name: formData.get("name"),
    category: formData.get("category"),
    seasonId: formData.get("seasonId"),
  };
  return teamSchema.safeParse(raw);
}

export function flattenZodErrors(
  error: z.ZodError<TeamInput>,
): TeamFormState["errors"] {
  const out: TeamFormState["errors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof TeamInput | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export function valuesFromFormData(formData: FormData): Record<string, string> {
  return {
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    seasonId: String(formData.get("seasonId") ?? ""),
  };
}

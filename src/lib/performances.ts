import { z } from "zod";

const optionalString = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((v) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null,
  );

const today = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

export const performanceStatusLabel: Record<"open" | "paid", string> = {
  open: "Open",
  paid: "Betaald",
};

export const performanceSchema = z.object({
  activityTypeId: z.coerce
    .number({ message: "Kies een type" })
    .int()
    .positive("Kies een type"),
  performanceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum")
    .refine(
      (v) => new Date(v) <= today(),
      "Datum kan niet in de toekomst liggen",
    ),
  team: z
    .union([z.string(), z.undefined(), z.null()])
    .transform((v) => {
      if (v == null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    }),
  notes: optionalString.pipe(
    z.string().max(1000, "Maximaal 1000 tekens").nullable(),
  ),
});

export type PerformanceInput = z.infer<typeof performanceSchema>;

export type PerformanceFormState = {
  errors?: Partial<Record<keyof PerformanceInput, string>>;
  message?: string;
  values?: Record<string, string>;
};

export function parsePerformanceForm(formData: FormData) {
  const raw = {
    activityTypeId: formData.get("activityTypeId"),
    performanceDate: formData.get("performanceDate"),
    team: formData.get("team"),
    notes: formData.get("notes"),
  };
  return performanceSchema.safeParse(raw);
}

export function flattenZodErrors(
  error: z.ZodError<PerformanceInput>,
): PerformanceFormState["errors"] {
  const out: PerformanceFormState["errors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof PerformanceInput | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export function valuesFromFormData(formData: FormData): Record<string, string> {
  return {
    activityTypeId: String(formData.get("activityTypeId") ?? ""),
    performanceDate: String(formData.get("performanceDate") ?? ""),
    team: String(formData.get("team") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

export function formatAmount(value: string | null | undefined): string {
  if (value == null) return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

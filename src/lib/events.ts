import { z } from "zod";

export const eventTypeSchema = z.enum([
  "training",
  "match",
  "meeting",
  "tournament",
  "other",
]);
export type EventType = z.infer<typeof eventTypeSchema>;

export const recurrenceSchema = z.enum(["none", "weekly"]);
export type Recurrence = z.infer<typeof recurrenceSchema>;

const dateTimeLocalSchema = z
  .string()
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
    "Ongeldige datum/tijd",
  );

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum");

const optionalText = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((v) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null,
  );

const optionalInt = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((v) => {
    if (typeof v !== "string" || v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && Number.isInteger(n) ? n : null;
  });

export const eventCreateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Titel is verplicht")
      .max(200, "Maximaal 200 tekens"),
    description: optionalText.pipe(z.string().nullable()),
    type: eventTypeSchema,
    teamId: optionalInt,
    location: optionalText.pipe(z.string().max(200, "Maximaal 200 tekens").nullable()),
    startsAt: dateTimeLocalSchema,
    endsAt: dateTimeLocalSchema,
    allDay: z
      .union([z.literal("on"), z.literal("true"), z.string(), z.undefined(), z.null()])
      .transform((v) => v === "on" || v === "true"),
    recurrence: recurrenceSchema.default("none"),
    repeatUntil: z
      .union([z.string(), z.undefined(), z.null()])
      .transform((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null)),
  })
  .refine(
    (d) => new Date(d.startsAt) < new Date(d.endsAt),
    {
      message: "Eindtijd moet na starttijd liggen",
      path: ["endsAt"],
    },
  )
  .refine(
    (d) => {
      if (d.recurrence === "none") return true;
      if (!d.repeatUntil) return false;
      return dateOnlySchema.safeParse(d.repeatUntil).success;
    },
    {
      message: "Bij herhalend event is een einddatum verplicht (datum)",
      path: ["repeatUntil"],
    },
  );

export type EventCreateInput = z.infer<typeof eventCreateSchema>;

export const eventUpdateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Titel is verplicht")
      .max(200, "Maximaal 200 tekens"),
    description: optionalText.pipe(z.string().nullable()),
    type: eventTypeSchema,
    teamId: optionalInt,
    location: optionalText.pipe(z.string().max(200, "Maximaal 200 tekens").nullable()),
    startsAt: dateTimeLocalSchema,
    endsAt: dateTimeLocalSchema,
    allDay: z
      .union([z.literal("on"), z.literal("true"), z.string(), z.undefined(), z.null()])
      .transform((v) => v === "on" || v === "true"),
  })
  .refine(
    (d) => new Date(d.startsAt) < new Date(d.endsAt),
    {
      message: "Eindtijd moet na starttijd liggen",
      path: ["endsAt"],
    },
  );

export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;

export type EventFormState = {
  errors?: Record<string, string>;
  message?: string;
  values?: Record<string, string>;
};

export function parseEventCreateForm(formData: FormData) {
  return eventCreateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type"),
    teamId: formData.get("teamId"),
    location: formData.get("location"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    allDay: formData.get("allDay"),
    recurrence: formData.get("recurrence") ?? "none",
    repeatUntil: formData.get("repeatUntil"),
  });
}

export function parseEventUpdateForm(formData: FormData) {
  return eventUpdateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type"),
    teamId: formData.get("teamId"),
    location: formData.get("location"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    allDay: formData.get("allDay"),
  });
}

export function flattenEventErrors(
  error: z.ZodError,
): EventFormState["errors"] {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as string | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export function valuesFromEventFormData(
  formData: FormData,
): Record<string, string> {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    type: String(formData.get("type") ?? "training"),
    teamId: String(formData.get("teamId") ?? ""),
    location: String(formData.get("location") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    allDay: formData.get("allDay") === "on" ? "on" : "",
    recurrence: String(formData.get("recurrence") ?? "none"),
    repeatUntil: String(formData.get("repeatUntil") ?? ""),
  };
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  training: "Training",
  match: "Wedstrijd",
  meeting: "Vergadering",
  tournament: "Tornooi",
  other: "Anders",
};

export type PerformancePeriod = "month" | "last-month" | "year" | "all";
export type PerformanceStatusFilter = "open" | "sent" | "paid" | "all";

export function periodRange(
  period: PerformancePeriod,
  now: Date = new Date(),
): { from: string | null; to: string | null } {
  const year = now.getFullYear();
  const month = now.getMonth();
  const toIso = (d: Date) => d.toISOString().slice(0, 10);

  if (period === "month") {
    return {
      from: toIso(new Date(year, month, 1)),
      to: toIso(new Date(year, month + 1, 1)),
    };
  }
  if (period === "last-month") {
    return {
      from: toIso(new Date(year, month - 1, 1)),
      to: toIso(new Date(year, month, 1)),
    };
  }
  if (period === "year") {
    return {
      from: toIso(new Date(year, 0, 1)),
      to: toIso(new Date(year + 1, 0, 1)),
    };
  }
  return { from: null, to: null };
}

export function parsePeriod(value: string | undefined): PerformancePeriod {
  if (value === "month" || value === "last-month" || value === "year") {
    return value;
  }
  return "all";
}

export function parseStatusFilter(
  value: string | undefined,
): PerformanceStatusFilter {
  if (value === "open" || value === "sent" || value === "paid") return value;
  return "all";
}

export function parseTrainerId(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

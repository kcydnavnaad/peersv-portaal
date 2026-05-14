export function isUniqueViolation(err: unknown): boolean {
  const has23505 = (e: unknown): boolean =>
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: unknown }).code === "23505";

  if (has23505(err)) return true;
  // Drizzle wraps postgres-js errors in DrizzleQueryError; the PostgresError sits on `cause`.
  if (typeof err === "object" && err !== null && "cause" in err) {
    return has23505((err as { cause: unknown }).cause);
  }
  return false;
}

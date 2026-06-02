import { eq } from "drizzle-orm";
import { db } from "@/db";
import { seasons } from "@/db/schema";

export async function getActiveSeason() {
  const [s] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.isActive, true))
    .limit(1);
  return s ?? null;
}

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { emailTokens } from "@/db/schema";

const PURPOSE_EXPIRY_MS: Record<TokenPurpose, number> = {
  password_reset: 60 * 60 * 1000, // 1 uur
  invite: 7 * 24 * 60 * 60 * 1000, // 7 dagen
};

export type TokenPurpose = "password_reset" | "invite";

/**
 * Genereer een random URL-safe token (32 bytes hex = 64 chars).
 */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hash een token met SHA-256 voor opslag in de DB.
 * We slaan nooit het ruwe token op — bij een DB-lek is het token niet bruikbaar
 * voor een aanvaller.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Maak een nieuw token aan voor een gebruiker en sla de hash op.
 * Returnt het RUWE token (te gebruiken in de URL die naar de gebruiker gestuurd wordt).
 */
export async function createToken(
  userId: number,
  purpose: TokenPurpose,
): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PURPOSE_EXPIRY_MS[purpose]);

  await db.insert(emailTokens).values({
    purpose,
    userId,
    tokenHash,
    expiresAt,
  });

  return token;
}

/**
 * Valideer een token: bestaat, juiste purpose, niet verlopen, niet gebruikt.
 * Returnt de userId als geldig, null anders.
 *
 * Dit consumeert het token NIET — gebruik consumeToken() na succesvol gebruik.
 */
export async function validateToken(
  token: string,
  purpose: TokenPurpose,
): Promise<{ userId: number; tokenId: number } | null> {
  const tokenHash = hashToken(token);

  const [row] = await db
    .select({
      id: emailTokens.id,
      userId: emailTokens.userId,
    })
    .from(emailTokens)
    .where(
      and(
        eq(emailTokens.tokenHash, tokenHash),
        eq(emailTokens.purpose, purpose),
        gt(emailTokens.expiresAt, new Date()),
        isNull(emailTokens.usedAt),
      ),
    )
    .limit(1);

  if (!row) return null;
  return { userId: row.userId, tokenId: row.id };
}

/**
 * Markeer een token als gebruikt (replay protection).
 */
export async function consumeToken(tokenId: number): Promise<void> {
  await db
    .update(emailTokens)
    .set({ usedAt: new Date() })
    .where(eq(emailTokens.id, tokenId));
}

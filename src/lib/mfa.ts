import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { db } from "@/db";
import { mfaRecoveryCodes } from "@/db/schema";

authenticator.options = {
  window: 1,
  step: 30,
  digits: 6,
};

const ISSUER = "PeerSV Portaal";

export function generateMfaSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpauthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, ISSUER, secret);
}

export async function generateQrCodeSvg(otpauthUrl: string): Promise<string> {
  return QRCode.toString(otpauthUrl, {
    type: "svg",
    width: 240,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}

export function verifyTotp(code: string, secret: string): boolean {
  const normalized = code.replace(/\s+/g, "").trim();
  if (!/^\d{6}$/.test(normalized)) return false;
  return authenticator.verify({ token: normalized, secret });
}

export function generateRecoveryCodes(): {
  codes: string[];
  hashes: string[];
} {
  const codes: string[] = [];
  const hashes: string[] = [];

  for (let i = 0; i < 10; i++) {
    const raw = randomBytes(4).toString("hex");
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`.toUpperCase();
    codes.push(formatted);
    hashes.push(hashRecoveryCode(formatted));
  }

  return { codes, hashes };
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase().trim()).digest("hex");
}

export async function consumeRecoveryCode(
  userId: number,
  code: string,
): Promise<boolean> {
  const normalized = code.toUpperCase().trim();
  if (!/^[A-F0-9]{4}-[A-F0-9]{4}$/.test(normalized)) return false;

  const codeHash = hashRecoveryCode(normalized);

  const result = await db
    .update(mfaRecoveryCodes)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(mfaRecoveryCodes.userId, userId),
        eq(mfaRecoveryCodes.codeHash, codeHash),
        isNull(mfaRecoveryCodes.usedAt),
      ),
    )
    .returning({ id: mfaRecoveryCodes.id });

  return result.length > 0;
}

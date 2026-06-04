import { createHash, randomBytes } from "node:crypto";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";

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

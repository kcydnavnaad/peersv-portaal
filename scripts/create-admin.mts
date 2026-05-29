#!/usr/bin/env tsx
/**
 * Create-admin tool voor PeerSV Portaal.
 *
 * Voegt een nieuwe admin user toe aan de users tabel met een
 * gegenereerd random wachtwoord. Wachtwoord wordt 1x getoond.
 *
 * Connection string via env var ADMIN_DB_URL.
 * Voor prod: gebruik kubectl port-forward (zie scripts/CREATE_ADMIN.md).
 */

import bcrypt from "bcrypt";
import postgres from "postgres";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { randomBytes } from "node:crypto";

const CONNECTION_STRING =
  process.env.ADMIN_DB_URL ?? "postgres://peersv:peersv@localhost:5433/peersv";

function generatePassword(length = 14): string {
  // Generate URL-safe random password without ambiguous chars (0/O, 1/l/I)
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let pwd = "";
  for (let i = 0; i < length; i++) {
    pwd += alphabet[bytes[i] % alphabet.length];
  }
  return pwd;
}

async function prompt(rl: readline.Interface, q: string): Promise<string> {
  const answer = await rl.question(q);
  return answer.trim();
}

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    console.log("\n=== Create Admin User ===\n");
    console.log("Connecting to:", CONNECTION_STRING.replace(/:[^:@]+@/, ":***@"));

    const firstName = await prompt(rl, "Voornaam: ");
    if (!firstName) throw new Error("Voornaam is verplicht");

    const lastName = await prompt(rl, "Achternaam: ");
    if (!lastName) throw new Error("Achternaam is verplicht");

    const email = await prompt(rl, "Email: ");
    if (!email || !email.includes("@")) throw new Error("Geldige email is verplicht");

    rl.close();

    const sql = postgres(CONNECTION_STRING, { onnotice: () => {} });

    try {
      // Check of email al bestaat
      const existing = await sql`
        SELECT id, role FROM users WHERE email = ${email.toLowerCase()}
      `;
      if (existing.length > 0) {
        console.error(
          `\nERROR: User met email ${email} bestaat al (id=${existing[0].id}, role=${existing[0].role})`,
        );
        process.exit(1);
      }

      const password = generatePassword(14);
      const passwordHash = await bcrypt.hash(password, 10);

      const [user] = await sql`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES (${email.toLowerCase()}, ${passwordHash}, ${firstName}, ${lastName}, 'admin')
        RETURNING id, email, first_name, last_name, role
      `;

      console.log("\n=== Admin User Created ===");
      console.log(`  ID:         ${user.id}`);
      console.log(`  Naam:       ${user.first_name} ${user.last_name}`);
      console.log(`  Email:      ${user.email}`);
      console.log(`  Role:       ${user.role}`);
      console.log("");
      console.log("  ┌────────────────────────────────────────┐");
      console.log(`  │ Wachtwoord: ${password.padEnd(27)}│`);
      console.log("  └────────────────────────────────────────┘");
      console.log("");
      console.log(
        "Geef dit wachtwoord door aan de gebruiker. Vraag hen om het via /profiel te wijzigen.",
      );
      console.log("Dit wachtwoord wordt nergens opgeslagen.\n");
    } finally {
      await sql.end();
    }
  } catch (err) {
    rl.close();
    if (err instanceof Error) {
      console.error("\nERROR:", err.message);
    } else {
      console.error("\nERROR:", err);
    }
    process.exit(1);
  }
}

main();

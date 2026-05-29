#!/usr/bin/env tsx
/**
 * Anonymizer voor PeerSV Portaal database.
 *
 * VOORWAARDEN:
 *   - Een lokale postgres op localhost:5434 met user/db "peersv"
 *   - Daarin een gerestoorde prod-backup
 *
 * Anonimiseert:
 *   - users: firstName, lastName, email, phone, iban (passwordHash blijft!)
 *   - members: firstName, lastName, email, phone, birthDate (randomized binnen zelfde jaar)
 *
 * Niet aangeraakt: teams, seasons, performances, attendances, team_members, team_trainers
 */

import { faker } from "@faker-js/faker/locale/nl_BE";
import postgres from "postgres";

const CONNECTION_STRING =
  process.env.ANON_DB_URL ?? "postgres://peersv:peersv@localhost:5434/peersv";

function generateBelgianIban(): string {
  // BE + 2 check digits + 12 digits
  const bban = String(Math.floor(Math.random() * 1e12)).padStart(12, "0");
  // Eenvoudige fake checksum (geen geldige MOD-97, maar realistisch format)
  const check = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `BE${check}${bban}`;
}

function randomizeBirthDateSameYear(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const month = Math.floor(Math.random() * 12) + 1;
  // Max 28 om altijd geldig te zijn ongeacht maand
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function main() {
  const sql = postgres(CONNECTION_STRING, { onnotice: () => {} });

  try {
    console.log("Connected to", CONNECTION_STRING.replace(/:[^:@]+@/, ":***@"));

    // Tellen voor sanity check
    const [userCount] = await sql`SELECT COUNT(*)::int as n FROM users`;
    const [memberCount] = await sql`SELECT COUNT(*)::int as n FROM members`;
    console.log(`Found ${userCount.n} users and ${memberCount.n} members`);

    if (userCount.n === 0 && memberCount.n === 0) {
      console.error("ERROR: Database is empty. Did you restore the backup?");
      process.exit(1);
    }

    // ============ USERS ============
    console.log("Anonymizing users...");
    const users = await sql<{ id: number; role: string }[]>`
      SELECT id, role FROM users ORDER BY id
    `;

    for (const u of users) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email =
        u.role === "admin"
          ? `admin${u.id}@anon.local`
          : `trainer${u.id}@anon.local`;
      const iban = generateBelgianIban();

      await sql`
        UPDATE users
        SET first_name = ${firstName},
            last_name = ${lastName},
            email = ${email},
            phone = NULL,
            iban = ${iban}
        WHERE id = ${u.id}
      `;
    }
    console.log(`  Updated ${users.length} users`);

    // ============ MEMBERS ============
    console.log("Anonymizing members...");
    const members = await sql<{ id: number; birth_date: string | null }[]>`
      SELECT id, birth_date FROM members ORDER BY id
    `;

    for (const m of members) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const birthDate = randomizeBirthDateSameYear(m.birth_date);

      await sql`
        UPDATE members
        SET first_name = ${firstName},
            last_name = ${lastName},
            email = NULL,
            phone = NULL,
            birth_date = ${birthDate}
        WHERE id = ${m.id}
      `;
    }
    console.log(`  Updated ${members.length} members`);

    console.log("\nDone. Database is anonymized.");
    console.log("Next: dump and load into dev.");
  } catch (err) {
    console.error("ERROR:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();

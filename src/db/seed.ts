import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { members, seasons, teams, users } from "./schema";

async function main() {
  console.log("Seeding users...");
  const adminHash = await bcrypt.hash("admin123", 10);
  const trainerHash = await bcrypt.hash("trainer123", 10);

  await db
    .insert(users)
    .values([
      {
        email: "admin@peersv.be",
        passwordHash: adminHash,
        firstName: "Admin",
        lastName: "PeerSV",
        role: "admin",
        isButterfly: false,
      },
      {
        email: "trainer@peersv.be",
        passwordHash: trainerHash,
        firstName: "Tom",
        lastName: "Trainer",
        role: "trainer",
        isButterfly: false,
        trainerRate: "25.00",
        iban: "BE68 5390 0754 7034",
      },
      {
        email: "vlinder@peersv.be",
        passwordHash: trainerHash,
        firstName: "Eva",
        lastName: "Vlinder",
        role: "trainer",
        isButterfly: true,
      },
    ])
    .onConflictDoNothing({ target: users.email });

  console.log("Seeding season...");
  await db
    .insert(seasons)
    .values({
      name: "2025-2026",
      startDate: "2025-07-01",
      endDate: "2026-06-30",
      isActive: true,
    })
    .onConflictDoNothing({ target: seasons.name });

  const [season] = await db
    .select()
    .from(seasons)
    .where(eq(seasons.name, "2025-2026"))
    .limit(1);

  if (!season) {
    throw new Error("Season was not created");
  }

  console.log("Seeding teams...");
  const existingTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.seasonId, season.id));

  if (existingTeams.length === 0) {
    await db.insert(teams).values([
      { name: "U13", category: "Jeugd", seasonId: season.id },
      { name: "Senioren A", category: "Senioren", seasonId: season.id },
      { name: "Dames A", category: "Dames", seasonId: season.id },
    ]);
  }

  console.log("Seeding members...");
  await db
    .insert(members)
    .values([
      {
        firstName: "Jan",
        lastName: "Janssens",
        email: "jan@peersv.be",
        team: "U15",
        status: "active",
      },
      {
        firstName: "Tom",
        lastName: "Peeters",
        email: "tom@peersv.be",
        team: "Senioren A",
        status: "active",
      },
      {
        firstName: "Lieve",
        lastName: "De Smet",
        email: "lieve@peersv.be",
        team: "Dames",
        status: "pending",
      },
    ])
    .onConflictDoNothing({ target: members.email });

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

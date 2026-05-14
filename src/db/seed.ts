import bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";
import { db } from "./index";
import {
  members,
  performances,
  seasons,
  teamTrainers,
  teams,
  users,
} from "./schema";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

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

  console.log("Seeding Tom's team link + performances...");
  const [tom] = await db
    .select()
    .from(users)
    .where(eq(users.email, "trainer@peersv.be"))
    .limit(1);
  const [senioren] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.name, "Senioren A"), eq(teams.seasonId, season.id)))
    .limit(1);

  if (tom && senioren) {
    const [link] = await db
      .select()
      .from(teamTrainers)
      .where(
        and(
          eq(teamTrainers.userId, tom.id),
          eq(teamTrainers.teamId, senioren.id),
        ),
      )
      .limit(1);
    if (!link) {
      await db.insert(teamTrainers).values({
        userId: tom.id,
        teamId: senioren.id,
        isHeadTrainer: true,
      });
    }

    const existingPerf = await db
      .select()
      .from(performances)
      .where(eq(performances.userId, tom.id))
      .limit(1);
    if (existingPerf.length === 0) {
      const rate = tom.trainerRate ?? "25.00";
      await db.insert(performances).values([
        {
          userId: tom.id,
          teamId: senioren.id,
          type: "training",
          performanceDate: daysAgo(14),
          amount: rate,
          status: "open",
          notes: "Tactiektraining",
        },
        {
          userId: tom.id,
          teamId: senioren.id,
          type: "training",
          performanceDate: daysAgo(7),
          amount: rate,
          status: "open",
        },
        {
          userId: tom.id,
          teamId: senioren.id,
          type: "match",
          performanceDate: daysAgo(2),
          amount: rate,
          status: "open",
          notes: "Thuiswedstrijd",
        },
      ]);
    }
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

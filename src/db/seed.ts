import "dotenv/config";
import { db } from "./index";
import { members } from "./schema";

async function main() {
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
    .onConflictDoNothing();

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

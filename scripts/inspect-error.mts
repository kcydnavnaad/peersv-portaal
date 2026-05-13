import { db } from "../src/db/index";
import { members } from "../src/db/schema";

try {
  await db.insert(members).values({
    firstName: "Test",
    lastName: "Dup",
    email: "jan@peersv.be",
    status: "active",
  });
  console.log("no error");
} catch (e: unknown) {
  const err = e as {
    constructor?: { name?: string };
    code?: unknown;
    cause?: {
      constructor?: { name?: string };
      code?: unknown;
      severity?: unknown;
      constraint_name?: unknown;
    };
    message?: string;
  };
  console.log("constructor:", err.constructor?.name);
  console.log("code on err:", err.code);
  console.log("has cause:", !!err.cause);
  console.log("cause constructor:", err.cause?.constructor?.name);
  console.log("cause code:", err.cause?.code);
  console.log("cause severity:", err.cause?.severity);
  console.log("cause constraint:", err.cause?.constraint_name);
  console.log("message:", err.message?.slice(0, 100));
}
process.exit(0);

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type PgClient = ReturnType<typeof postgres>;
type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  __pgClient?: PgClient;
  __drizzle?: Db;
};

function getDb(): Db {
  if (globalForDb.__drizzle) return globalForDb.__drizzle;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = globalForDb.__pgClient ?? postgres(url, { max: 10 });
  globalForDb.__pgClient = client;
  const instance = drizzle(client, { schema });
  globalForDb.__drizzle = instance;
  return instance;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
}) as Db;

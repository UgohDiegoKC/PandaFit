import "server-only";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __pandafitDb?: ReturnType<typeof makeDb> };

function makeDb() {
  const client = createClient({
    url: process.env.DATABASE_URL ?? "file:./data/pandafit.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
  return drizzle(client, { schema });
}

export const db = globalForDb.__pandafitDb ?? makeDb();
if (process.env.NODE_ENV !== "production") globalForDb.__pandafitDb = db;

export { schema };

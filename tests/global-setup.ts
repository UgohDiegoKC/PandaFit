import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

/** Fresh SQLite DB with the current schema for integration tests. */
export default function setup() {
  for (const f of ["data/test.db", "data/test.db-journal", "data/test.db-wal", "data/test.db-shm"]) rmSync(f, { force: true });
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: "file:./data/test.db" }, stdio: "pipe" });
}

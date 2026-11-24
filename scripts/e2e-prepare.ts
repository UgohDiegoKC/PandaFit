/** Fresh database for end-to-end tests. Runs before the test server starts. */
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const url = process.env.DATABASE_URL ?? "file:./data/e2e.db";
if (!url.includes("e2e")) throw new Error(`Refusing to reset a non-e2e database: ${url}`);
const file = url.replace(/^file:/, "");
for (const f of [file, `${file}-wal`, `${file}-shm`, `${file}-journal`]) rmSync(f, { force: true });
execSync("npx drizzle-kit push --force", { stdio: "pipe" });
execSync("npx tsx --conditions=react-server scripts/seed.ts", { stdio: "inherit" });

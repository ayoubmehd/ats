import { config } from "dotenv";
import { pool } from "./src/db/connection.js";
import { applicationsTable, jobsTable, sessionsTable, usersTable } from "./src/db/schema.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { getTableName, sql } from "drizzle-orm";
import { type TestProject } from "vitest/node";
config({
  path: ".test.env",
});
const client = await pool.connect();
const db = drizzle(client);

async function truncateTables() {
  await db.delete(applicationsTable);
  await db.delete(jobsTable);
  await db.delete(sessionsTable);
  await db.delete(usersTable);
  const table = (t: any) => sql.identifier(getTableName(t));
  await db.execute(
    sql`TRUNCATE TABLE ${table(applicationsTable)} RESTART IDENTITY`,
  );
  await db.execute(
    sql`TRUNCATE TABLE ${table(jobsTable)} RESTART IDENTITY CASCADE`,
  );
  await db.execute(
    sql`TRUNCATE TABLE ${table(usersTable)} RESTART IDENTITY CASCADE`,
  );
  await db.insert(usersTable).values({
    id: "1",
    name: "Recruiter",
    email: "recruiter@example.com",
    role: "recruiter",
  });
}

export async function setup(project: TestProject) {
  console.log("Setting up database");
  await truncateTables();
  // project.onTestsRerun(async () => {
  //   console.log("Rerunning tests");
  //   await truncateTables();
  // });
}

export function teardown() {
  db.$client.release();
}

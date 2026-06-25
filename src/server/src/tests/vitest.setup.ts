import { config } from "dotenv";
import { pool } from "../db/connection.js";
import { applicationsTable, jobsTable, usersTable } from "../db/schema.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { getTableName, sql } from "drizzle-orm";
import { type TestProject } from "vitest/node";
import { afterAll, beforeAll } from "vitest";
config({
  path: ".test.env",
});
const client = await pool.connect();
const db = drizzle(client);

beforeAll(async () => {
  console.log("Setting up database");
  await db.delete(applicationsTable);
  await db.delete(jobsTable);
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
});

afterAll(() => {
  db.$client.release();
});

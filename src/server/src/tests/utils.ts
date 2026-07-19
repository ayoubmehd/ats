import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../db/connection.js";
import { usersTable } from "../db/schema.js";
import { eq } from "drizzle-orm";
const client = await pool.connect();
const db = drizzle(client);

export async function getOrCreateRecruiter({
  email = "recruiter@example.com",
}: {
  email?: string;
}) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (user) {
    return user;
  }
  return await db
    .insert(usersTable)
    .values({
      id: "recruiter-1",
      name: "Recruiter",
      email,
      role: "recruiter",
    })
    .returning()
    .then(([user]) => user);
}

export async function getOrCreateCandidate({
  email = "candidate@example.com",
}: {
  email?: string;
}) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (user) {
    return user;
  }
  return await db
    .insert(usersTable)
    .values({
      id: "candidate-1",
      name: "Candidate",
      email,
      role: "candidate",
    })
    .returning()
    .then(([user]) => user);
}

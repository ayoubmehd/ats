import { randomUUID } from "crypto";
import { initAuthConfig } from "@hono/auth-js";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Hono } from "hono";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../db/connection.js";
import { db } from "../db/connection.js";
import {
  accountsTable,
  sessionsTable,
  usersTable,
  verificationTokensTable,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
const client = await pool.connect();
const testDb = drizzle(client);

function getAuthConfig() {
  return {
    secret: process.env.AUTH_SECRET!,
    adapter: DrizzleAdapter(db, {
      usersTable,
      accountsTable,
      sessionsTable,
      verificationTokensTable,
    }),
    providers: [],
    session: {
      strategy: "database" as const,
    },
    trustHost: true,
  };
}

export function withAuth(router: OpenAPIHono) {
  const app = new OpenAPIHono();
  app.use(
    "*",
    initAuthConfig(() => getAuthConfig()),
  );
  app.route("/", router);
  return app;
}

export async function createSessionCookie(userId: string) {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await testDb.insert(sessionsTable).values({
    sessionToken,
    userId,
    expires,
  });
  return `authjs.session-token=${sessionToken}`;
}

export async function getOrCreateRecruiter({
  email = "recruiter@example.com",
}: {
  email?: string;
}) {
  const [user] = await testDb
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (user) {
    return user;
  }
  return await testDb
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
  const [user] = await testDb
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (user) {
    return user;
  }
  return await testDb
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

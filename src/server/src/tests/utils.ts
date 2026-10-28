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
import { and, eq } from "drizzle-orm";
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

// TODO: Fix race condition where two recruiters are created with the same email at the same time
function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "code" in error.cause &&
    error.cause.code === "23505"
  );
}

async function insertUser(values: {
  email: string;
  name: string;
  role: "admin" | "recruiter" | "candidate";
  deletedAt?: Date | null;
}) {
  try {
    const [created] = await testDb
      .insert(usersTable)
      .values({
        id: randomUUID(),
        ...values,
      })
      .returning();
    return created;
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
    const [user] = await testDb
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, values.email))
      .limit(1);
    if (!user) {
      throw error;
    }
    return user;
  }
}

export async function getOrCreateUser({
  email,
  name,
  role,
  deletedAt = null,
}: {
  email: string;
  name: string;
  role: "admin" | "recruiter" | "candidate";
  deletedAt?: Date | null;
}) {
  const [user] = await testDb
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.email, email), eq(usersTable.role, role)))
    .limit(1);
  if (user) {
    return user;
  }
  return insertUser({ email, name, role, deletedAt });
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
  return insertUser({
    name: "Recruiter",
    email,
    role: "recruiter",
  });
}
// TODO: Fix race condition where two candidates are created with the same email at the same time
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
  return insertUser({
    name: "Candidate",
    email,
    role: "candidate",
  });
}

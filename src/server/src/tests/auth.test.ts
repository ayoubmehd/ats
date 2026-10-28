import { createApp } from "../create-app.js";
import { test, expect, beforeAll } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../db/connection.js";
import { sessionsTable, usersTable } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { createSessionCookie } from "./utils.js";

const app = createApp();
const client = await pool.connect();
const db = drizzle(client);

let authCookie: string;

beforeAll(async () => {
  const [{ id }] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, "recruiter@example.com"))
    .limit(1);
  authCookie = await createSessionCookie(id);
});

test("GET /auth/session returns null without cookie", async () => {
  const response = await app.request("/auth/session");
  expect(response.status).toBe(200);
  expect(await response.json()).toBeNull();
});

test("GET /auth/session returns user with valid session cookie", async () => {
  const response = await app.request("/auth/session", {
    headers: { Cookie: authCookie },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.user.email).toBe("recruiter@example.com");
  expect(body.user.name).toBe("Recruiter");
  expect(body.expires).toBeDefined();
});

test("GET /auth/providers lists configured providers", async () => {
  const response = await app.request("/auth/providers");
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.google).toMatchObject({
    id: "google",
    name: "Google",
    type: "oidc",
  });
  expect(body.google.signinUrl).toContain("/auth/signin/google");
  expect(body.google.callbackUrl).toContain("/auth/callback/google");
});

test("GET /auth/csrf returns csrf token", async () => {
  const response = await app.request("/auth/csrf");
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(typeof body.csrfToken).toBe("string");
  expect(body.csrfToken.length).toBeGreaterThan(0);
});

test("GET /auth/session returns null with invalid session cookie", async () => {
  const response = await app.request("/auth/session", {
    headers: { Cookie: "authjs.session-token=invalid-token" },
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toBeNull();
});

test("GET /auth/session returns null with expired session", async () => {
  const [{ id }] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, "recruiter@example.com"))
    .limit(1);
  const expiredToken = crypto.randomUUID();
  await db.insert(sessionsTable).values({
    sessionToken: expiredToken,
    userId: id,
    expires: new Date(Date.now() - 1000),
  });

  const response = await app.request("/auth/session", {
    headers: { Cookie: `authjs.session-token=${expiredToken}` },
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toBeNull();
});

test("protected routes succeed with valid session", async () => {
  const response = await app.request("/jobs", {
    headers: { Cookie: authCookie },
  });
  expect(response.status).toBe(200);
});

import { expect, test } from "vitest";
import { createApp } from "../create-app.js";
import { jobsTable } from "../db/schema.js";
import {
  createSessionCookie,
  getOrCreateUser,
  testDb,
} from "./utils.js";
import type { Role } from "../authorization.js";

const app = createApp();
const internalPaths = ["/-/docs", "/-/scalar", "/-/db/health"] as const;

async function cookieFor(role: Role, email: string, deletedAt?: Date) {
  const user = await getOrCreateUser({
    email,
    name: role,
    role,
    deletedAt,
  });
  return createSessionCookie(user.id);
}

test("anonymous callers cannot open internal routes", async () => {
  for (const path of internalPaths) {
    const response = await app.request(path);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Unauthorized" });
  }
});

test("admin, recruiter, and candidate cannot open internal routes", async () => {
  const callers = [
    await cookieFor("admin", "internal-admin@example.com"),
    await cookieFor("recruiter", "internal-recruiter@example.com"),
    await cookieFor("candidate", "internal-candidate@example.com"),
  ];
  for (const cookie of callers) {
    for (const path of internalPaths) {
      const response = await app.request(path, {
        headers: { Cookie: cookie },
      });
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ message: "Forbidden" });
    }
  }
});

test("a dev can open docs, scalar, and database health", async () => {
  const cookie = await cookieFor("dev", "internal-dev@example.com");
  const docs = await app.request("/-/docs", { headers: { Cookie: cookie } });
  expect(docs.status).toBe(200);
  expect((await docs.json()).openapi).toBe("3.0.0");

  const scalar = await app.request("/-/scalar", { headers: { Cookie: cookie } });
  expect(scalar.status).toBe(200);

  const health = await app.request("/-/db/health", {
    headers: { Cookie: cookie },
  });
  expect(health.status).toBe(200);
  expect(await health.json()).toEqual({
    status: "ok",
    message: "Database is healthy",
  });
});

test("a dev can open internal routes in production", async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const productionApp = createApp();
    const cookie = await cookieFor("dev", "internal-dev@example.com");
    const docs = await productionApp.request("/-/docs", {
      headers: { Cookie: cookie },
    });
    expect(docs.status).toBe(200);
    const health = await productionApp.request("/-/db/health");
    expect(health.status).toBe(401);
  } finally {
    if (previous === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previous;
    }
  }
});

test("a soft-deleted dev cannot open internal routes", async () => {
  const cookie = await cookieFor(
    "dev",
    "deleted-dev@example.com",
    new Date(),
  );
  const response = await app.request("/-/docs", { headers: { Cookie: cookie } });
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ message: "Unauthorized" });
});

test("a dev has no hiring permissions", async () => {
  const recruiter = await getOrCreateUser({
    email: "dev-scope-recruiter@example.com",
    name: "Dev Scope Recruiter",
    role: "recruiter",
  });
  const [openJob] = await testDb
    .insert(jobsTable)
    .values({ title: "Dev sees open", status: "open", posterId: recruiter.id })
    .returning();
  const [draftJob] = await testDb
    .insert(jobsTable)
    .values({ title: "Dev misses draft", status: "draft", posterId: recruiter.id })
    .returning();
  const cookie = await cookieFor("dev", "dev-hiring@example.com");

  const jobs = await app.request("/jobs", { headers: { Cookie: cookie } });
  expect(jobs.status).toBe(200);
  const ids = (await jobs.json()).map((job: { id: number }) => job.id);
  expect(ids).toContain(openJob.id);
  expect(ids).not.toContain(draftJob.id);

  const candidates = await app.request("/candidates", {
    headers: { Cookie: cookie },
  });
  expect(candidates.status).toBe(403);

  const create = await app.request("/jobs", {
    method: "POST",
    body: JSON.stringify({ title: "Dev should not post" }),
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
  });
  expect(create.status).toBe(403);

  const applications = await app.request("/applications", {
    headers: { Cookie: cookie },
  });
  expect(applications.status).toBe(403);
});

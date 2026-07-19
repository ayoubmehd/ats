import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../db/connection.js";
import { jobsTable, usersTable } from "../db/schema.js";
import { jobsRouter as jobsRouterBase } from "../routes/jobs.js";
import { test, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { createSessionCookie, withAuth } from "./utils.js";
const client = await pool.connect();
const db = drizzle(client);

const jobsRouter = withAuth(jobsRouterBase);

let posterId: string;
let authCookie: string;

beforeAll(async () => {
  const [{ id }] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, "recruiter@example.com"))
    .limit(1);
  posterId = id;
  authCookie = await createSessionCookie(posterId);
  await db.insert(jobsTable).values({
    title: "Software Engineer",
    summary: "A great opportunity",
    content: "Full job description here",
    status: "open",
    posterId,
  });
});

test("get jobs", async () => {
  const response = await jobsRouter.request("/jobs", {
    headers: {
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.length).toBeGreaterThan(0);
  expect(body[0].id).toBeDefined();
});

let lastJobId: number;

test("create job", async () => {
  const response = await jobsRouter.request("/jobs", {
    method: "POST",
    body: JSON.stringify({
      title: "Product Manager",
      summary: "Lead product development",
      content: "Detailed job description",
      status: "draft",
      posterId,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(201);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBeDefined();
  lastJobId = body.id;
  expect(body.title).toBe("Product Manager");
  expect(body.summary).toBe("Lead product development");
  expect(body.content).toBe("Detailed job description");
  expect(body.status).toBe("draft");
  expect(body.posterId).toBe(posterId);
});

test("get job", async () => {
  const response = await jobsRouter.request(`/jobs/${lastJobId}`, {
    headers: {
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBe(lastJobId);
  expect(body.title).toBe("Product Manager");
  expect(body.summary).toBe("Lead product development");
  expect(body.content).toBe("Detailed job description");
  expect(body.status).toBe("draft");
  expect(body.posterId).toBe(posterId);
});

test("update job", async () => {
  const response = await jobsRouter.request(`/jobs/${lastJobId}`, {
    method: "PUT",
    body: JSON.stringify({
      title: "Senior Product Manager",
      summary: "Lead product strategy",
      content: "Updated job description",
      status: "open",
      posterId,
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.id).toBe(lastJobId);
  expect(body.title).toBe("Senior Product Manager");
  expect(body.summary).toBe("Lead product strategy");
  expect(body.content).toBe("Updated job description");
  expect(body.status).toBe("open");
  expect(body.posterId).toBe(posterId);
});

test("delete job", async () => {
  const response = await jobsRouter.request(`/jobs/${lastJobId}`, {
    method: "DELETE",
    headers: {
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.message).toBe("Job deleted successfully");
});

test("get deleted job", async () => {
  const response = await jobsRouter.request(`/jobs/${lastJobId}`, {
    headers: {
      Cookie: authCookie,
    },
  });
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body).toBeDefined();
  expect(body.message).toBe("Job not found");
});
